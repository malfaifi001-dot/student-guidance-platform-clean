import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 card-shadow">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-slate-900">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-500">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}