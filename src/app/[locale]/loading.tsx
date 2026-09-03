import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-[34rem] w-full rounded-[2rem]" />
    </main>
  );
}
