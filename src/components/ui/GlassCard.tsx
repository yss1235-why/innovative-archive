import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> { }

export function GlassCard({ className, children, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
