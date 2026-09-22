import { useEffect, useRef, useState, type FormEvent } from 'react';
import { loginUser } from '../../api/auth';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setMessage('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    setSubmitting(true);
    setMessage('');
    try {
      await loginUser(String(formData.get('email') ?? '').trim(), String(formData.get('password') ?? ''));
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog className="modal login-modal" id="loginDialog" ref={dialogRef} onClose={onClose}>
      <form id="loginForm" onSubmit={submit}>
        <div className="modal-head"><div><small>U봇 LOGIN</small><h3>로그인하고 이어서 상담할까요?</h3></div><button id="loginClose" type="button" aria-label="로그인 창 닫기" onClick={onClose}>×</button></div>
        <p className="modal-desc">비회원으로 나눈 대화는 그대로 유지됩니다.</p>
        <label><span>이메일</span><input id="loginEmail" name="email" type="email" autoComplete="username" placeholder="이메일을 입력해 주세요" required /></label>
        <label><span>비밀번호</span><input id="loginPassword" name="password" type="password" autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" required /></label>
        <p className="admin-store-form-message" id="loginMessage" role="alert">{message}</p>
        <button id="loginSubmit" className="black-btn modal-full" type="submit" disabled={submitting}>{submitting ? '로그인 중…' : '로그인'}</button>
      </form>
    </dialog>
  );
}
