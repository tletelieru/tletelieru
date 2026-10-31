import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import WebhookVerifyTool from './WebhookVerifyTool';

const BODY = '{"id":"evt_1","type":"payment.succeeded"}';
const GITHUB = 'sha256=5320fab54f300e24656cb47617cd6d91c8d8a447c45d1eb941c2e0851f1536b7';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Result') as HTMLTextAreaElement;
}

describe('WebhookVerifyTool', () => {
  it('verifies a GitHub signature', async () => {
    render(<WebhookVerifyTool />);
    await userEvent.click(screen.getByRole('button', { name: 'GitHub' }));
    fireEvent.change(screen.getByLabelText('Signing secret'), { target: { value: 'my_secret' } });
    fireEvent.change(screen.getByLabelText('Raw request body'), { target: { value: BODY } });
    fireEvent.change(screen.getByLabelText('X-Hub-Signature-256 header'), {
      target: { value: GITHUB },
    });
    await waitFor(() => expect(output().value).toContain('Signature matches'));
  });

  it('shows the tolerance result for Stripe after hydration', async () => {
    render(<WebhookVerifyTool />);
    fireEvent.change(screen.getByLabelText('Signing secret'), {
      target: { value: 'whsec_test_secret' },
    });
    fireEvent.change(screen.getByLabelText('Raw request body'), { target: { value: BODY } });
    fireEvent.change(screen.getByLabelText('Stripe-Signature header'), {
      target: { value: 't=1700000000,v1=00' },
    });
    await waitFor(() => expect(output().value).toContain('Signature does not match'));
    expect(output().value).toContain('Outside the 300 s tolerance');
  });

  it('reports a malformed header', async () => {
    render(<WebhookVerifyTool />);
    fireEvent.change(screen.getByLabelText('Signing secret'), { target: { value: 's' } });
    fireEvent.change(screen.getByLabelText('Raw request body'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Stripe-Signature header'), {
      target: { value: 'nope' },
    });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('format'));
  });

  it('never puts the secret in the URL', () => {
    render(<WebhookVerifyTool />);
    fireEvent.change(screen.getByLabelText('Signing secret'), { target: { value: 'hunter2' } });
    expect(window.location.search).not.toContain('hunter2');
  });

  it('previews the result of the input placeholder', async () => {
    render(<WebhookVerifyTool />);
    await waitFor(() => expect(output().placeholder).toContain('Signature matches'));
  });

  it('renders in Spanish', async () => {
    render(
      <LocaleProvider locale="es">
        <WebhookVerifyTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Secreto de firma')).toBeInTheDocument();
    await waitFor(() =>
      expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
        'La firma coincide',
      ),
    );
  });
});
