import { cn } from '@/lib/utils/cn';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-xl border border-stone',
          'bg-white px-3.5 py-2 text-[13.5px]',
          'text-charcoal placeholder:text-muted-faint',
          'transition-all duration-150',
          'hover:border-stone-strong',
          'focus-visible:outline-none focus-visible:border-wine',
          'focus-visible:ring-2 focus-visible:ring-wine/15',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-porcelain',
          className,
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
export { Input };
