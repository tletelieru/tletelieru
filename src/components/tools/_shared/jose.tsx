import Stack from '@mui/material/Stack';
import { defineMessages, useMessages } from '~/i18n/react';
import { keyEncodings, type KeyEncoding } from '~/lib/tools/hash';
import { looksLikeSecret, type KeyFailure, type KeySource } from '~/lib/tools/jose/keys';
import type { JwtError } from '~/lib/tools/jwt';
import { jwtMessages } from '../jwt/messages';
import { InputPanel } from './InputPanel';
import { ChoiceToggle } from './options';

export const joseMessages = defineMessages({
  en: {
    encoding: 'Secret encoding',
    encodings: { text: 'Text', hex: 'Hex', base64: 'Base64' } satisfies Record<KeyEncoding, string>,
    sources: {
      secret: 'shared secret',
      pem: 'PEM key',
      jwk: 'JWK',
      jwks: 'JWKS',
    } satisfies Record<KeySource, string>,
    keyFailures: {
      'key-empty': 'Paste a key.',
      'key-json': 'The key starts like JSON but is not valid JSON.',
      'key-not-jwk': 'That is not a JWK or JWKS: a JWK needs "kty".',
      'key-jwks-empty': 'The JWKS has no usable keys.',
      'key-encoding': 'The secret is not valid in the selected encoding.',
      'key-invalid': 'The key is invalid or Web Crypto rejected it.',
      'key-unsupported': 'Unsupported key type (only oct, RSA and EC P-256/384/521).',
      'key-type': 'The key type does not fit the algorithm.',
      'key-curve': 'The EC curve does not match the algorithm.',
      'key-use': 'The key "use" or "key_ops" does not allow this operation.',
      'key-alg': 'The key declares a different "alg".',
      'key-size': 'RSA keys must have at least 2048 bits (RFC 7518).',
      'key-public': 'This operation needs a private key.',
      'kid-not-found': 'No key in the JWKS has the token kid.',
      'kid-ambiguous': 'More than one key in the JWKS matches: refusing to guess.',
      'pem-malformed': 'The PEM block is malformed.',
      'pem-encrypted': 'Encrypted PEM keys are not supported: decrypt it first.',
      'pem-unsupported': 'Unsupported PEM type: use PUBLIC KEY or PRIVATE KEY blocks.',
    } satisfies Record<KeyFailure, string>,
  },
  es: {
    encoding: 'Codificación del secreto',
    encodings: { text: 'Texto', hex: 'Hex', base64: 'Base64' },
    sources: {
      secret: 'secreto compartido',
      pem: 'clave PEM',
      jwk: 'JWK',
      jwks: 'JWKS',
    },
    keyFailures: {
      'key-empty': 'Pega una clave.',
      'key-json': 'La clave parece JSON, pero no es JSON válido.',
      'key-not-jwk': 'Eso no es un JWK ni un JWKS: un JWK necesita "kty".',
      'key-jwks-empty': 'El JWKS no tiene claves utilizables.',
      'key-encoding': 'El secreto no es válido en la codificación elegida.',
      'key-invalid': 'La clave no es válida o Web Crypto la rechazó.',
      'key-unsupported': 'Tipo de clave no soportado (solo oct, RSA y EC P-256/384/521).',
      'key-type': 'El tipo de clave no corresponde al algoritmo.',
      'key-curve': 'La curva EC no corresponde al algoritmo.',
      'key-use': 'El "use" o "key_ops" de la clave no permite esta operación.',
      'key-alg': 'La clave declara otro "alg".',
      'key-size': 'Las claves RSA deben tener al menos 2048 bits (RFC 7518).',
      'key-public': 'Esta operación necesita una clave privada.',
      'kid-not-found': 'Ninguna clave del JWKS tiene el kid del token.',
      'kid-ambiguous': 'Más de una clave del JWKS coincide: no se elige al azar.',
      'pem-malformed': 'El bloque PEM está mal formado.',
      'pem-encrypted': 'No se admiten claves PEM cifradas: descífrala primero.',
      'pem-unsupported': 'Tipo de PEM no soportado: usa bloques PUBLIC KEY o PRIVATE KEY.',
    },
  },
});

export function describeJwtError(error: JwtError, t: (typeof jwtMessages)['en']): string {
  switch (error.code) {
    case 'empty':
      return '';
    case 'segments':
      return t.errors.segments(error.count);
    case 'jwe':
      return t.errors.jwe;
    case 'base64':
      return t.errors.base64(t.segmentNames[error.segment]);
    case 'utf8':
      return t.errors.utf8(t.segmentNames[error.segment]);
    case 'json':
      return t.errors.json(t.segmentNames[error.segment], error.detail.line, error.detail.column);
    case 'not-object':
      return t.errors.notObject(t.segmentNames[error.segment]);
  }
}

export function useJwtErrors() {
  return useMessages(jwtMessages);
}

interface KeyFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  encoding: KeyEncoding;
  onEncodingChange: (value: KeyEncoding) => void;
  placeholder?: string;
}

export function KeyField({
  label,
  value,
  onChange,
  encoding,
  onEncodingChange,
  placeholder,
}: KeyFieldProps) {
  const t = useMessages(joseMessages);
  return (
    <Stack spacing={1} sx={{ alignItems: 'stretch' }}>
      <InputPanel
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        minRows={3}
        history={false}
      />
      {looksLikeSecret(value) && (
        <Stack direction="row">
          <ChoiceToggle
            label={t.encoding}
            value={encoding}
            options={keyEncodings}
            labels={t.encodings}
            onChange={onEncodingChange}
          />
        </Stack>
      )}
    </Stack>
  );
}
