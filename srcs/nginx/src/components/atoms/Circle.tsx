interface CircleProps {
  children: React.ReactNode;
  className?: string;
}

const Circle = ({ children, className = '' }: CircleProps) => {
  return (
    <div
      className={`
      bg-white/80
      lg-bg-teal-100/10
      shadow-2xl
      z-0
      flex
      items-center
      justify-center
      transition-all duration-900 ease-in-out
      relative
      w-[90%]
      h-[80vh]
      rounded-3xl
      mx-auto
      text-gray-700

      lg:absolute
      lg:top-1/2
      lg:left-1/2
      lg:-translate-x-1/2
      lg:-translate-y-1/2
      lg:w-[120vh]
      lg:h-[120vh]
      lg:rounded-full
      ${className}`}
    >
      <div className="relative z-10 text-center w-full max-w-4xl px-6 ">{children}</div>
    </div>
  );
};

export default Circle;
