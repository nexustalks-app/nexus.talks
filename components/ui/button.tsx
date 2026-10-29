import { cn } from '@/lib/utils/cn';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'wine';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-xl transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          {
            'bg-wine text-white hover:bg-wine-hover shadow-sm':
              variant === 'primary' || variant === 'wine',
            'border border-stone bg-white text-charcoal hover:bg-porcelain hover:border-stone-strong shadow-sm':
              variant === 'secondary',
            'text-muted hover:bg-stone/40 hover:text-charcoal':
              variant === 'ghost',
            'h-8 px-3 text-[12.5px]': size === 'sm',
            'h-10 px-4 text-[13.5px]': size === 'md',
            'h-11 px-5 text-[14px]': size === 'lg',
          },
          className,
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
export { Button };
