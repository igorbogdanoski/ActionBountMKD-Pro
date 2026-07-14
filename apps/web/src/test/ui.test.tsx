import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Card, Badge, Toggle, Modal } from '../components/ui';

describe('Button', () => {
  it('renders children and handles click', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Зачувај</Button>);
    const btn = screen.getByRole('button', { name: 'Зачувај' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies the primary brand variant by default', () => {
    render(<Button>OK</Button>);
    expect(screen.getByRole('button').className).toContain('bg-brand-500');
  });

  it('is disabled and does not fire click while loading', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>OK</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the indigo app-primary variant, distinct from the coral primary', () => {
    render(<Button variant="app-primary">Зачувај</Button>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('bg-indigo-600');
    expect(cls).not.toContain('bg-brand-500');
  });

  it('applies the emerald success and rose danger variants (consolidated from green/red)', () => {
    const { rerender } = render(<Button variant="success">OK</Button>);
    expect(screen.getByRole('button').className).toContain('bg-emerald-600');
    rerender(<Button variant="danger">Избриши</Button>);
    expect(screen.getByRole('button').className).toContain('bg-rose-600');
  });

  it('colorClassName overrides the variant color entirely', () => {
    render(<Button variant="primary" colorClassName="bg-purple-700 text-white">Custom</Button>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('bg-purple-700');
    expect(cls).not.toContain('bg-brand-500');
  });

  it('size="icon" applies compact square padding with no text gap', () => {
    render(<Button size="icon" aria-label="Затвори">×</Button>);
    const cls = screen.getByRole('button', { name: 'Затвори' }).className;
    expect(cls).toContain('p-2');
    expect(cls).not.toContain('gap-2');
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card>содржина</Card>);
    expect(screen.getByText('содржина')).toBeTruthy();
  });

  it('defaults to the theme-aware tone (light/dark pair)', () => {
    render(<Card>содржина</Card>);
    const cls = screen.getByText('содржина').className;
    expect(cls).toContain('bg-white');
    expect(cls).toContain('dark:bg-slate-800');
  });

  it('tone="dark" always renders the dark palette, no dark: prefix', () => {
    render(<Card tone="dark">содржина</Card>);
    const cls = screen.getByText('содржина').className;
    expect(cls).toContain('bg-slate-800');
    expect(cls).not.toContain('dark:bg-slate-800');
  });
});

describe('Badge', () => {
  it('renders with the requested colour', () => {
    render(<Badge color="emerald">Јавно</Badge>);
    expect(screen.getByText('Јавно').className).toContain('text-emerald-700');
  });
});

describe('Toggle', () => {
  it('reflects checked state and toggles on click', () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Темно" />);
    const sw = screen.getByRole('switch', { name: 'Темно' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Modal', () => {
  it('does not render when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="Наслов">тело</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders title/children and closes on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Наслов">тело</Modal>);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('тело')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Наслов">тело</Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'Затвори' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('moves focus into the dialog on open', () => {
    render(<Modal open onClose={() => {}} title="Наслов">тело</Modal>);
    expect(screen.getByRole('button', { name: 'Затвори' })).toHaveFocus();
  });

  it('restores focus to the trigger element on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Отвори';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(trigger).toHaveFocus();

    const { rerender } = render(<Modal open onClose={() => {}} title="Наслов">тело</Modal>);
    expect(trigger).not.toHaveFocus();

    rerender(<Modal open={false} onClose={() => {}} title="Наслов">тело</Modal>);
    expect(trigger).toHaveFocus();

    document.body.removeChild(trigger);
  });

  it('traps Tab focus within the dialog, wrapping from last back to first', () => {
    render(
      <Modal open onClose={() => {}} title="Наслов" footer={<button>Потврди</button>}>
        <input placeholder="внес" />
      </Modal>
    );
    const closeBtn = screen.getByRole('button', { name: 'Затвори' });
    const confirmBtn = screen.getByRole('button', { name: 'Потврди' });
    expect(closeBtn).toHaveFocus();

    confirmBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeBtn).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirmBtn).toHaveFocus();
  });
});
