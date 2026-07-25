import { Suspense } from 'react';
import { CreateRoomForm } from '@/components/lobby/CreateRoomForm';
import { JoinRoomForm } from '@/components/lobby/JoinRoomForm';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
          Rummi<span className="text-amber-400">kub</span>
        </h1>
        <p className="mt-2 text-slate-400">El clásico juego de fichas, multijugador en tiempo real. Juega con amigos, sin descargas.</p>
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
    </main>
  );
}
