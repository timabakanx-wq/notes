import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mmixcfejfqnvrifzkeuk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nGh1ff_xlz9x8Rsh_O3s6w_xe0TztKK';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('note-form');
const authorInput = document.getElementById('author');
const contentInput = document.getElementById('content');
const counter = document.getElementById('counter');
const submitBtn = document.getElementById('submit-btn');
const notesEl = document.getElementById('notes');
const statusEl = document.getElementById('status');

contentInput.addEventListener('input', () => {
  counter.textContent = `${contentInput.value.length} / 500`;
});

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function render(notes) {
  if (!notes.length) {
    notesEl.innerHTML = '<div class="empty">Пока заметок нет. Будь первым!</div>';
    return;
  }
  notesEl.innerHTML = notes.map(n => `
    <article class="note" data-id="${n.id}">
      <div class="meta">
        <span class="author">${escapeHtml(n.author || 'Аноним')}</span>
        <span>${timeAgo(n.created_at)}</span>
      </div>
      <div class="content">${escapeHtml(n.content)}</div>
    </article>
  `).join('');
}

async function loadNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    statusEl.textContent = 'Ошибка загрузки: ' + error.message;
    return;
  }
  render(data);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';

  const content = contentInput.value.trim();
  const author = authorInput.value.trim() || 'Аноним';

  if (!content) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправка...';

  const { error } = await supabase
    .from('notes')
    .insert({ content, author });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Отправить';

  if (error) {
    statusEl.textContent = 'Ошибка: ' + error.message;
    return;
  }

  contentInput.value = '';
  counter.textContent = '0 / 500';
  await loadNotes();
});

// realtime: обновляем список при новых заметках
supabase
  .channel('notes-channel')
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notes' },
      () => loadNotes())
  .subscribe();

loadNotes();
