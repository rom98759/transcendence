interface WelcomeCircleProps {
  children: React.ReactNode;
  className?: string;
  size?: number;
}

/**
 * WelcomeCircle - Cercle lumineux spécifique à la page Welcome
 * Design: Atome/électron avec effet glassmorphism et ombres cyan/bleu
 */
const WelcomeCircle = ({ children, className = '', size = 120 }: WelcomeCircleProps) => {
  return (
    <>
      <div
        style={
          {
            '--circle-size': `${size}vh`,
          } as React.CSSProperties
        }
        className={`no-scrollbar
        bg-white/95
        backdrop-blur-xl
        shadow-[0_8px_32px_rgba(0,255,159,0.15),0_0_100px_rgba(0,136,255,0.1)]
        border border-white/40
        z-0
        flex
        items-center
        justify-center
        transition-all duration-700 ease-in-out
        relative
        w-full
        min-h-[75vh]
        max-h-[92vh]
        rounded-3xl
        mx-auto
        text-gray-800
        overflow-y-auto
        overflow-x-hidden

        lg:absolute
        lg:top-1/2
        lg:left-1/2
        lg:-translate-x-1/2
        lg:-translate-y-1/2
        lg:h-[var(--circle-size)]
        lg:w-[var(--circle-size)]
        lg:min-h-0
        lg:max-h-[95vh]
        lg:rounded-full
        lg:overflow-y-auto
        lg:overflow-x-hidden
        ${className}`}
      >
        <div className="relative z-10 text-center w-full max-w-md px-4 sm:px-6 md:px-8 py-4 lg:py-6">
          {children}
        </div>
      </div>
    </>
  );
};

export default WelcomeCircle;
