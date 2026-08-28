import type { ReactNode } from "react";

type TransformWrapperProps = {
  children: ReactNode | ((controls: Record<string, never>) => ReactNode);
  [key: string]: unknown;
};

type TransformComponentProps = {
  children: ReactNode;
  wrapperClass?: string;
  contentClass?: string;
  [key: string]: unknown;
};

export const TransformWrapper = ({ children }: TransformWrapperProps) => {
  return <>{typeof children === "function" ? children({}) : children}</>;
};

export const TransformComponent = ({
  children,
  wrapperClass = "",
  contentClass = "",
}: TransformComponentProps) => {
  return (
    <div className={wrapperClass}>
      <div className={contentClass}>{children}</div>
    </div>
  );
};
