import { TeachixLogo } from "@/components/brand/teachix-logo";

type NativeAuthBrandProps = {
  title?: string;
  hideTitle?: boolean;
  description: string;
};

export function NativeAuthBrand({ title, hideTitle = false, description }: NativeAuthBrandProps) {
  return (
    <header className="text-center">
      <div className="mx-auto flex w-fit items-center gap-2.5 text-sky-600 dark:text-white">
        <TeachixLogo iconOnly size="md" className="!w-10 text-sky-600 dark:text-white" />
        <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
          Teachix
        </span>
      </div>
      {title && !hideTitle ? (
        <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
          {title}
        </h1>
      ) : null}
      <p className={`${title && !hideTitle ? "mt-2" : "mt-4"} mx-auto max-w-sm text-sm font-medium leading-6 text-slate-500 dark:text-slate-300`}>
        {description}
      </p>
    </header>
  );
}
