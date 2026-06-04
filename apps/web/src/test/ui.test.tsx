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
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card>содржина</Card>);
    expect(screen.getByText('содржина')).toBeTruthy();
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
});
