"use client";

/**
 * PDF Invoice Generator
 * 
 * Generates professional PDF invoices with GST details
 * using jspdf + jspdf-autotable
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Invoice } from "./invoice";
import { amountToWords, formatCurrency } from "./gst-utils";

// ============================================
// PDF Configuration
// ============================================

const PDF_CONFIG = {
    pageWidth: 210,   // A4 width in mm
    pageHeight: 297,  // A4 height in mm
    margin: 15,
    lineHeight: 6,

    colors: {
        primary: [75, 0, 130] as [number, number, number],      // Indigo
        secondary: [100, 100, 100] as [number, number, number], // Gray
        light: [245, 245, 245] as [number, number, number],     // Light gray
        text: [30, 30, 30] as [number, number, number],         // Dark text
    },

    fonts: {
        title: 18,
        heading: 12,
        normal: 10,
        small: 8,
    },
};

// ============================================
// PDF Generation
// ============================================

/**
 * Generate PDF invoice and trigger download
 */
export function downloadInvoicePDF(invoice: Invoice): void {
    const pdf = generateInvoicePDF(invoice);
    const filename = `Invoice_${invoice.invoiceNumber || invoice.orderId}.pdf`;
    pdf.save(filename);
}

/**
 * Generate PDF invoice and return as blob URL
 */
export function getInvoicePDFUrl(invoice: Invoice): string {
    const pdf = generateInvoicePDF(invoice);
    const blob = pdf.output("blob");
    return URL.createObjectURL(blob);
}

/**
 * Main PDF generation function
 */
function generateInvoicePDF(invoice: Invoice): jsPDF {
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    let yPos = PDF_CONFIG.margin;

    // Header
    yPos = drawHeader(pdf, invoice, yPos);

    // Seller & Buyer Info
    yPos = drawPartyInfo(pdf, invoice, yPos);

    // Items Table
    yPos = drawItemsTable(pdf, invoice, yPos);

    // Tax Summary
    yPos = drawTaxSummary(pdf, invoice, yPos);

    // Totals
    yPos = drawTotals(pdf, invoice, yPos);

    // Footer
    drawFooter(pdf, invoice);

    return pdf;
}

// ============================================
// PDF Section Drawers
// ============================================

function drawHeader(pdf: jsPDF, invoice: Invoice, y: number): number {
    const { margin, colors, fonts } = PDF_CONFIG;
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Title
    pdf.setFontSize(fonts.title);
    pdf.setTextColor(...colors.primary);
    pdf.setFont("helvetica", "bold");
    pdf.text("TAX INVOICE", pageWidth / 2, y, { align: "center" });

    y += 10;

    // Invoice details box
    pdf.setFontSize(fonts.normal);
    pdf.setTextColor(...colors.text);
    pdf.setFont("helvetica", "normal");

    // Invoice number & date (right aligned)
    const rightX = pageWidth - margin;

    pdf.setFont("helvetica", "bold");
    pdf.text("Invoice No:", rightX - 50, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(invoice.invoiceNumber || "DRAFT", rightX, y, { align: "right" });

    y += PDF_CONFIG.lineHeight;

    pdf.setFont("helvetica", "bold");
    pdf.text("Date:", rightX - 50, y);
    pdf.setFont("helvetica", "normal");
    const invoiceDate = invoice.invoiceGeneratedAt
        ? new Date(invoice.invoiceGeneratedAt.seconds * 1000).toLocaleDateString("en-IN")
        : new Date().toLocaleDateString("en-IN");
    pdf.text(invoiceDate, rightX, y, { align: "right" });

    y += PDF_CONFIG.lineHeight;

    // Status indicator if draft
    if (!invoice.invoiceNumber) {
        pdf.setTextColor(200, 100, 0);
        pdf.setFont("helvetica", "italic");
        pdf.text("(Draft - Invoice number will be generated on shipment)", rightX, y, { align: "right" });
        pdf.setTextColor(...colors.text);
        y += PDF_CONFIG.lineHeight;
    }

    y += 5;

    // Divider line
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);

    return y + 8;
}

function drawPartyInfo(pdf: jsPDF, invoice: Invoice, y: number): number {
    const { margin, colors, fonts } = PDF_CONFIG;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const halfWidth = (pageWidth - 2 * margin) / 2 - 5;

    // Seller section
    pdf.setFontSize(fonts.heading);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...colors.primary);
    pdf.text("From (Seller)", margin, y);

    // Buyer section
    pdf.text("To (Buyer)", margin + halfWidth + 10, y);

    y += PDF_CONFIG.lineHeight;
    pdf.setFontSize(fonts.normal);
    pdf.setTextColor(...colors.text);
    pdf.setFont("helvetica", "normal");

    // Seller details
    const sellerLines = [
        invoice.seller.name,
        invoice.seller.address,
        `State: ${invoice.seller.state} (${invoice.seller.stateCode})`,
        invoice.seller.gstin ? `GSTIN: ${invoice.seller.gstin}` : "GSTIN: Applied for",
    ];

    sellerLines.forEach((line) => {
        pdf.text(line, margin, y);
        y += PDF_CONFIG.lineHeight - 1;
    });

    // Reset y for buyer
    y -= (sellerLines.length * (PDF_CONFIG.lineHeight - 1));

    // Buyer details
    const buyerLines = [
        invoice.buyer.name,
        invoice.buyer.phone,
        invoice.buyer.address,
        `State: ${invoice.buyer.state} (${invoice.buyer.stateCode})`,
    ];
    if (invoice.buyer.gstin) {
        buyerLines.push(`GSTIN: ${invoice.buyer.gstin}`);
    }

    buyerLines.forEach((line) => {
        pdf.text(line, margin + halfWidth + 10, y);
        y += PDF_CONFIG.lineHeight - 1;
    });

    // Move to max of seller/buyer lines
    y = Math.max(y, y + (sellerLines.length - buyerLines.length) * (PDF_CONFIG.lineHeight - 1));
    y += 5;

    // Supply type indicator
    pdf.setFontSize(fonts.small);
    pdf.setTextColor(...colors.secondary);
    const supplyType = invoice.isInterstate ? "Interstate Supply (IGST)" : "Intrastate Supply (CGST + SGST)";
    pdf.text(supplyType, margin, y);

    return y + 10;
}

function drawItemsTable(pdf: jsPDF, invoice: Invoice, y: number): number {
    const { margin, colors } = PDF_CONFIG;

    // Table headers
    const headers = [
        "S.No",
        "Description",
        "HSN",
        "Qty",
        "Rate (incl.)",
        "GST %",
        "Taxable",
        "Amount",
    ];

    // Table data
    const data = invoice.items.map((item, index) => [
        (index + 1).toString(),
        item.name,
        item.hsnCode || "-",
        item.quantity.toString(),
        formatCurrency(item.unitPrice).replace("₹", ""),
        `${item.gstRate}%`,
        formatCurrency(item.basePrice).replace("₹", ""),
        formatCurrency(item.totalAmount).replace("₹", ""),
    ]);

    autoTable(pdf, {
        startY: y,
        head: [headers],
        body: data,
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 9,
            cellPadding: 2,
        },
        headStyles: {
            fillColor: colors.primary,
            textColor: [255, 255, 255],
            fontStyle: "bold",
        },
        alternateRowStyles: {
            fillColor: colors.light,
        },
        columnStyles: {
            0: { cellWidth: 12, halign: "center" },
            1: { cellWidth: "auto" },
            2: { cellWidth: 18, halign: "center" },
            3: { cellWidth: 12, halign: "center" },
            4: { cellWidth: 25, halign: "right" },
            5: { cellWidth: 15, halign: "center" },
            6: { cellWidth: 25, halign: "right" },
            7: { cellWidth: 25, halign: "right" },
        },
    });

    // Get the final Y position after the table
    return (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
}

function drawTaxSummary(pdf: jsPDF, invoice: Invoice, y: number): number {
    const { margin, colors, fonts } = PDF_CONFIG;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const rightX = pageWidth - margin;

    // Tax Summary Header
    pdf.setFontSize(fonts.heading);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...colors.primary);
    pdf.text("Tax Summary", margin, y);

    y += PDF_CONFIG.lineHeight;
    pdf.setFontSize(fonts.normal);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.text);

    // Taxable Amount
    pdf.text("Taxable Amount:", margin, y);
    pdf.text(formatCurrency(invoice.taxSummary.taxableAmount), rightX, y, { align: "right" });
    y += PDF_CONFIG.lineHeight;

    // Tax breakdown
    if (invoice.isInterstate) {
        // IGST
        pdf.text(`IGST:`, margin, y);
        pdf.text(formatCurrency(invoice.taxSummary.igst), rightX, y, { align: "right" });
        y += PDF_CONFIG.lineHeight;
    } else {
        // CGST
        pdf.text(`CGST:`, margin, y);
        pdf.text(formatCurrency(invoice.taxSummary.cgst), rightX, y, { align: "right" });
        y += PDF_CONFIG.lineHeight;

        // SGST
        pdf.text(`SGST:`, margin, y);
        pdf.text(formatCurrency(invoice.taxSummary.sgst), rightX, y, { align: "right" });
        y += PDF_CONFIG.lineHeight;
    }

    // Total Tax
    pdf.setFont("helvetica", "bold");
    pdf.text("Total Tax:", margin, y);
    pdf.text(formatCurrency(invoice.taxSummary.totalTax), rightX, y, { align: "right" });

    return y + 10;
}

function drawTotals(pdf: jsPDF, invoice: Invoice, y: number): number {
    const { margin, colors, fonts } = PDF_CONFIG;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const rightX = pageWidth - margin;

    // Divider
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, rightX, y);
    y += 5;

    pdf.setFontSize(fonts.normal);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.text);

    // Subtotal
    pdf.text("Subtotal:", margin, y);
    pdf.text(formatCurrency(invoice.subtotal), rightX, y, { align: "right" });
    y += PDF_CONFIG.lineHeight;

    // Delivery charges (placeholder)
    if (invoice.deliveryCharges > 0) {
        pdf.text("Delivery Charges:", margin, y);
        pdf.text(formatCurrency(invoice.deliveryCharges), rightX, y, { align: "right" });
        y += PDF_CONFIG.lineHeight;
    }

    // Grand Total
    y += 2;
    pdf.setFontSize(fonts.heading);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...colors.primary);
    pdf.text("Grand Total:", margin, y);
    pdf.text(formatCurrency(invoice.grandTotal), rightX, y, { align: "right" });

    y += PDF_CONFIG.lineHeight + 2;

    // Amount in words
    pdf.setFontSize(fonts.small);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(...colors.secondary);
    pdf.text(`Amount in words: ${amountToWords(invoice.grandTotal)}`, margin, y);

    return y + 15;
}

function drawFooter(pdf: jsPDF, invoice: Invoice): void {
    const { margin, colors, fonts } = PDF_CONFIG;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const y = pageHeight - 30;

    // Divider
    pdf.setDrawColor(...colors.secondary);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y, pageWidth - margin, y);

    // Footer text
    pdf.setFontSize(fonts.small);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...colors.secondary);

    const footerY = y + 5;
    pdf.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

    pdf.setFontSize(7);
    pdf.text(
        "This is a computer-generated invoice. No signature required.",
        pageWidth / 2,
        footerY + 5,
        { align: "center" }
    );

    // Order reference at bottom
    pdf.text(
        `Order Ref: ${invoice.orderId}`,
        margin,
        footerY + 10
    );
}
