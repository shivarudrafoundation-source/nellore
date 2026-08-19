import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to merge Tailwind classes safely
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// 1. Luxury Gold/Black Button (Inflexible Heights to prevent inconsistencies)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'solid', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-sans font-semibold tracking-luxury uppercase transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none",
          // Rigid Heights & Padding
          size === 'sm' && "h-9 px-4 text-xs",
          size === 'md' && "h-11 px-6 text-sm", // Standard 44px
          size === 'lg' && "h-12 px-8 text-base", // Standard 48px
          // Styles
          variant === 'solid' && "bg-luxury-gold text-luxury-black-pure hover:bg-luxury-gold-rich hover:shadow-[0_0_15px_rgba(212,175,55,0.3)]",
          variant === 'outline' && "bg-transparent border border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-luxury-black-pure",
          variant === 'text' && "bg-transparent text-luxury-white hover:text-luxury-gold px-2",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// 2. Luxury Content Input (Strict heights, bottom-border aesthetic)
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="font-sans text-xs uppercase tracking-luxury text-luxury-gold-rich font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "w-full h-11 bg-luxury-black-obsidian border-b border-luxury-gray-border focus:border-luxury-gold text-luxury-white font-sans text-sm px-3 transition-colors duration-300 outline-none placeholder:text-luxury-gray/40",
            error && "border-red-500 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <span className="font-sans text-xs text-red-500 tracking-wide mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// 3. Luxurious Card Layout (Self-aligning grid card)
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, hoverEffect = true, children, ...props }) => {
  return (
    <div
      className={cn(
        "bg-luxury-black-obsidian border border-luxury-gray-border p-6 md:p-8 flex flex-col justify-between transition-all duration-300 select-none",
        hoverEffect && "hover:border-luxury-gold/40 hover:shadow-[0_10px_30px_rgba(0,0,0,0.8)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// 4. Global Layout Container (Enforces pixel-aligned layout and responsive padding)
export const Container: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// 5. Shared Page Layout Frame (Premium Cinematic Backdrop)
interface PageLayoutProps {
  children: React.ReactNode;
  subtitle?: string;
  title: string;
}

export const PageLayout = ({ children, title, subtitle }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-luxury-black text-luxury-white flex flex-col justify-between selection:bg-luxury-gold selection:text-luxury-black-pure overflow-x-hidden">
      {/* Editorial Decorative Header Line */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-luxury-gold/30 to-transparent" />
      
      {/* Main Content Area */}
      <main className="flex-grow py-12 md:py-20 flex flex-col justify-center">
        <Container className="space-y-12">
          {/* Main Typography Header Section */}
          <div className="text-center space-y-3">
            {subtitle && (
              <p className="font-sans text-xs md:text-sm uppercase tracking-luxury text-luxury-gold-rich font-medium">
                {subtitle}
              </p>
            )}
            <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-light tracking-wide text-luxury-white">
              {title}
            </h1>
            <div className="w-16 h-[0.5px] bg-luxury-gold mx-auto mt-4" />
          </div>
          
          {/* Main Inner Block */}
          <div className="w-full">
            {children}
          </div>
        </Container>
      </main>

      {/* Footer Branding Line */}
      <footer className="py-8 border-t border-luxury-gray-border/30 bg-luxury-black-deep">
        <Container className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-sans text-[10px] tracking-luxury text-luxury-gray uppercase">
            © {new Date().getFullYear()} Siva Rudra Foundations. All Rights Reserved.
          </p>
          <p className="font-sans text-[10px] tracking-luxury text-luxury-gold font-semibold uppercase">
            Cinematic Luxury Event Engine
          </p>
        </Container>
      </footer>
    </div>
  );
};
