-- Tabla para almacenar feedback del chatbot
create table public.chatbot_feedback (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  interaction_type text default 'search' check (interaction_type in ('search', 'faq')),
  created_at timestamp with time zone default now()
);

-- Comentarios para documentación
comment on table public.chatbot_feedback is 'Feedback de los usuarios sobre las interacciones con el chatbot';
comment on column public.chatbot_feedback.rating is 'Calificación del 1 al 5';
comment on column public.chatbot_feedback.comment is 'Comentario opcional del usuario';
comment on column public.chatbot_feedback.interaction_type is 'Tipo de interacción: search (búsqueda guiada) o faq (preguntas frecuentes)';

-- RLS para chatbot_feedback
alter table public.chatbot_feedback enable row level security;

-- Cualquiera puede insertar feedback (incluso usuarios no autenticados)
create policy "Cualquiera puede insertar feedback"
  on public.chatbot_feedback for insert
  with check (true);

-- Los usuarios solo pueden ver su propio feedback
create policy "Usuarios pueden ver su propio feedback"
  on public.chatbot_feedback for select
  using (auth.uid() = user_id or user_id is null);

-- Índice para consultas por usuario
create index if not exists chatbot_feedback_user_idx on public.chatbot_feedback(user_id);
create index if not exists chatbot_feedback_created_at_idx on public.chatbot_feedback(created_at);
