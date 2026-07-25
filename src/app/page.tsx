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
        <p className="mt-2 text-slate-400">Real-time multiplayer tile rummy. Play with friends, no download.</p>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-2">
        <CreateRoomForm />
        <Suspense fallback={<div className="rounded-2xl border border-app-border bg-app-surface p-6" />}>
          <JoinRoomForm />
        </Suspense>
      </div>

      <p className="max-w-md text-center text-xs text-slate-500">
        Best experienced on a desktop-sized screen (1024px+). Drag tiles from your rack onto the table to build
        sets and runs — your first move must total at least 30 points.
      </p>
    </main>
  );
}
