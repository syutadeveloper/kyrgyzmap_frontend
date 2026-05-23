import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const [email, setEmail] = useState('sample@example.com');
  const [password, setPassword] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await login(email);
    navigate('/mypage');
  };

  return (
    <AuthShell title="ログイン">
      <form className="stack-form" onSubmit={submit}>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="メールアドレス" />
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="パスワード" />
        <button type="submit">ログイン</button>
        <button className="google-button" type="button" onClick={() => void login('google-user@example.com').then(() => navigate('/mypage'))}>Googleでログイン</button>
      </form>
      <p><Link to="/register">会員登録</Link> / <Link to="/forgot-password">パスワードリセット</Link></p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { register } = useApp();
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await register(name || '新規ユーザー', email);
    navigate('/mypage');
  };

  return (
    <AuthShell title="会員登録">
      <form className="stack-form" onSubmit={submit}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="ユーザー名" />
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="メールアドレス" required />
        <input type="password" placeholder="パスワード" />
        <button type="submit">登録する</button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await api.forgotPassword(email);
    setSent(true);
  };

  return (
    <AuthShell title="パスワードリセット">
      <form className="stack-form" onSubmit={submit}>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="登録メールアドレス" />
        <button type="submit">再設定メールを送る</button>
      </form>
      {sent && <p className="notice">再設定リンクを送信しました。</p>}
    </AuthShell>
  );
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="back-link" to="/">← 地図へ戻る</Link>
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}
