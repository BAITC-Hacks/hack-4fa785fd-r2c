import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <div className="flex min-h-96 flex-col items-center justify-center gap-5 text-center"><p className="eyebrow">404</p><h1 className="text-3xl font-semibold">Страница не найдена</h1><p className="text-muted-foreground">Проверьте адрес или вернитесь к разделам проекта.</p><Button asChild><Link href="/">На главную</Link></Button></div>;
}
