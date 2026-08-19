import { TeachixLogo } from "@/components/brand/teachix-logo";

type NativeAuthBrandProps = {
  title: string;
  description: string;
};

export function NativeAuthBrand({ title, description }: NativeAuthBrandProps) {
  return (
    <header className="text-center">
      <div className="mx-auto flex w-fit items-center gap-2.5 text-[#1769FF] dark:text-white">
        <TeachixLogo iconOnly size="md" className="!w-10 text-[#1769FF] dark:text-white" />
        <span className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
          Teachix
        </span>
      </div>
      <h1 className="mt-8 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-7 text-slate-500 dark:text-slate-300">
        {description}
      </p>
    </header>
  );
}
