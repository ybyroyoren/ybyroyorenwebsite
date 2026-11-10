-- Each shop category gets a color (shown on the category labels over product photos).
alter table categories add column if not exists color text not null default '#efe8d8';
