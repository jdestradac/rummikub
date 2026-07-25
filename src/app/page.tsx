import { Suspense } from 'react';
import { CreateRoomForm } from '@/components/lobby/CreateRoomForm';
import { JoinRoomForm } from '@/components/lobby/JoinRoomForm';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { HeroTiles } from '@/components/lobby/HeroTiles';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 0%, var(--color-felt-light) 0%, transparent 70%)',
          opacity: 0.25,
        }}
      />

      <ThemeSwitcher className="absolute right-4 top-4" />

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="text-center">
          <HeroTiles />
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
            Rummi<span className="text-amber-400">kub</span>
          </h1>
          <p className="mt-2 text-slate-400">
            El clásico juego de fichas, multijugador en tiempo real. Juega con amigos, sin descargas.
          </p>
        </div>

        <div className="grid w-full gap-6 sm:grid-cols-2">
          <CreateRoomForm />
          <Suspense fallback={<div className="rounded-2xl border border-app-border bg-app-surface p-6" />}>
            <JoinRoomForm />
          </Suspense>
        </div>

        <p className="max-w-md text-center text-xs text-slate-500">
          Se ve mejor en pantallas de escritorio (1024px+). Arrastra fichas de tu atril a la mesa para armar
          juegos y escaleras — tu primera jugada debe sumar al menos 30 puntos.
        </p>
      </div>
    </main>
  );
}
