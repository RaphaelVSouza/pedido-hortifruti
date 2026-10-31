#!/usr/bin/env node
/**
 * Higienização de mensagens para corpus de teste (ADR-006).
 * Remove telefones, chaves PIX, e-mails, links e endereços conhecidos.
 * Valida ausência estrita de telefones e e-mails residuais (lança erro se sobrar).
 */

const URL_RE = /https?:\/\/[^\s<>"'{}|\\^`]+|www\.[^\s<>"'{}|\\^`]+|wa\.me\/[^\s<>"'{}|\\^`]+|chat\.whatsapp\.com\/[^\s<>"'{}|\\^`]+/gi;
const EMAIL_RE = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/gi;

// Chaves PIX (UUID, CPF, CNPJ ou linha explícita)
const UUID_PIX_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b/g;
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[-.]?\d{2}\b/g;
const PIX_LINE_RE = /(?:^|\b)(?:chave\s+)?pix\s*[:=-]\s*[^\r\n]+/gi;

// Telefones (rotulados, internacionais, com DDD, isolados ou dígitos contínuos)
const PHONE_LABEL_RE = /(?:\b(?:tel|cel|celular|fone|telefone|whats(?:app)?|zap)\b[\s.:-]*)(?:\+?55\s*)?(?:\(?0?[1-9]{2}\)?\s*)?(?:9\s*)?\d{4}[-\s.]?\d{4}\b/gi;
const PHONE_INTL_RE = /\+55\s*\(?0?[1-9]{2}\)?\s*(?:9\s*)?\d{4}[-\s.]?\d{4}\b/g;
const PHONE_DDD_RE = /(?:^|[^\d])(?:\(0?[1-9]{2}\)\s*|(?:\b0?[1-9]{2}\s+))(?:9\s*)?\d{4}[-\s.]?\d{4}\b/g;
const PHONE_STANDALONE_RE = /\b(?:9\d{4}|\d{4})[-\s]\d{4}\b/g;
const PHONE_RAW_DIGITS_RE = /\b(?:[1-9]{2}9?\d{8})\b/g;

// Endereços e CEPs
const CEP_RE = /\b(?:cep[:\s]*)?\d{5}[-\s]?\d{3}\b/gi;
const ADDRESS_LABEL_RE = /(?:\b(?:endereço|endereco|localização|localizacao|retirada\s+em|loja\s+em)\b\s*[:=-]\s*[^\r\n]+)/gi;
const STREET_RE = /\b(?:rua|r\.|av\.|avenida|travessa|trav\.|alameda|al\.|praça|praca|pra[cç]a|rodovia|rod\.|estrada|est\.)\s+[^,\n\r]+(?:,\s*\d+[^,\n\r]*)?(?:-\s*[^,\n\r]*)?/gi;

// Regex estrito para validação residual
const RESIDUAL_EMAIL_RE = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/;
const RESIDUAL_PHONE_RE = /(?:\+?55\s*)?(?:\(?0?[1-9]{2}\)?\s*)?(?:9\s*)?\d{4}[-\s.]?\d{4}\b|\b(?:[1-9]{2}9?\d{8})\b/;

function validateClean(text) {
  const emailMatch = text.match(RESIDUAL_EMAIL_RE);
  if (emailMatch) {
    throw new Error(`Validação falhou: e-mail residual encontrado: "${emailMatch[0]}"`);
  }
  const phoneMatch = text.match(RESIDUAL_PHONE_RE);
  if (phoneMatch) {
    throw new Error(`Validação falhou: telefone residual encontrado: "${phoneMatch[0]}"`);
  }
}

function anonymize(text) {
  let s = String(text || '');

  // 1. Links e URLs
  s = s.replace(URL_RE, '');

  // 2. Chaves PIX rotuladas
  s = s.replace(PIX_LINE_RE, '');

  // 3. E-mails
  s = s.replace(EMAIL_RE, '');

  // 4. Telefones rotulados e padrões explícitos
  s = s.replace(PHONE_LABEL_RE, '');
  s = s.replace(PHONE_INTL_RE, '');
  s = s.replace(PHONE_DDD_RE, (match) => {
    return match.startsWith('(') ? '' : (match[0].match(/\d/) ? '' : match[0]);
  });
  s = s.replace(PHONE_RAW_DIGITS_RE, '');
  s = s.replace(PHONE_STANDALONE_RE, '');

  // 5. Chaves PIX avulsas (UUID, CPF, CNPJ)
  s = s.replace(UUID_PIX_RE, '');
  s = s.replace(CNPJ_RE, '');
  s = s.replace(CPF_RE, '');

  // 6. Endereços e CEPs
  s = s.replace(ADDRESS_LABEL_RE, '');
  s = s.replace(STREET_RE, '');
  s = s.replace(CEP_RE, '');

  // Normalização de espaços e linhas vazias excessivas
  s = s
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Validação estrita
  validateClean(s);

  return s;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.error('Uso: node tests/anonymize.js <input.txt> [output.txt]');
    process.exit(1);
  }

  const fs = require('fs');
  const path = require('path');
  const inputPath = path.resolve(args[0]);

  if (!fs.existsSync(inputPath)) {
    console.error(`Erro: arquivo de entrada não encontrado: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  try {
    const clean = anonymize(raw);
    if (args[1]) {
      const outputPath = path.resolve(args[1]);
      fs.writeFileSync(outputPath, clean + '\n', 'utf8');
      console.log(`Arquivo higienizado salvo em: ${outputPath}`);
    } else {
      process.stdout.write(clean + '\n');
    }
  } catch (err) {
    console.error(`Erro de higienização: ${err.message}`);
    process.exit(1);
  }
}

module.exports = anonymize;
module.exports.anonymize = anonymize;
module.exports.validateClean = validateClean;
