import { describe, expect, it } from 'vitest';
import {
  caseIds,
  convertAllCases,
  convertCase,
  convertLines,
  isCaseId,
  isMultiline,
  removeAccents,
  splitWords,
} from './case';

describe('splitWords', () => {
  it.each([
    ['parseHTTPResponse', ['parse', 'HTTP', 'Response']],
    ['XMLHttpRequest', ['XML', 'Http', 'Request']],
    ['HTTPSConnection', ['HTTPS', 'Connection']],
    ['getHTTP', ['get', 'HTTP']],
    ['version2Update', ['version2', 'Update']],
    ['v2', ['v2']],
    ['HTML5Parser', ['HTML5', 'Parser']],
    ['user_id', ['user', 'id']],
    ['user-id', ['user', 'id']],
    ['  Hello   World  ', ['Hello', 'World']],
    [
      'some_mixed-separators.and/more  words',
      ['some', 'mixed', 'separators', 'and', 'more', 'words'],
    ],
    ['__private__value', ['private', 'value']],
    ['CONSTANT_CASE_VALUE', ['CONSTANT', 'CASE', 'VALUE']],
    ['Árbol de Navidad', ['Árbol', 'de', 'Navidad']],
    ['añoNuevoFeliz', ['año', 'Nuevo', 'Feliz']],
    ["don't stop", ['dont', 'stop']],
    ['camelCase', ['camel', 'Case']],
    ['PascalCase', ['Pascal', 'Case']],
    ['ID', ['ID']],
    ['userID', ['user', 'ID']],
    ['', []],
    ['  ---  ', []],
  ])('splits %j', (input, words) => {
    expect(splitWords(input)).toEqual(words);
  });

  it('can strip accents', () => {
    expect(splitWords('Árbol de Navidad ñandú', { stripAccents: true })).toEqual([
      'Arbol',
      'de',
      'Navidad',
      'nandu',
    ]);
    expect(removeAccents('Ação São João')).toBe('Acao Sao Joao');
  });
});

describe('convertCase', () => {
  it.each([
    ['parseHTTPResponse', 'snake', 'parse_http_response'],
    ['parseHTTPResponse', 'camel', 'parseHttpResponse'],
    ['parseHTTPResponse', 'pascal', 'ParseHttpResponse'],
    ['XMLHttpRequest', 'kebab', 'xml-http-request'],
    ['XMLHttpRequest', 'constant', 'XML_HTTP_REQUEST'],
    ['version2Update', 'snake', 'version2_update'],
    ['version2Update', 'kebab', 'version2-update'],
    ['api v2 endpoint', 'camel', 'apiV2Endpoint'],
    ['user_id', 'camel', 'userId'],
    ['user-profile-page', 'pascal', 'UserProfilePage'],
    ['hello world', 'title', 'Hello World'],
    ['HELLO_WORLD', 'title', 'Hello World'],
    ['HELLO_WORLD', 'sentence', 'Hello world'],
    ['helloWorld', 'dot', 'hello.world'],
    ['helloWorld', 'path', 'hello/world'],
    ['helloWorld', 'lower', 'hello world'],
    ['helloWorld', 'upper', 'HELLO WORLD'],
    ['Árbol de Navidad', 'snake', 'árbol_de_navidad'],
    ['Árbol de Navidad', 'camel', 'árbolDeNavidad'],
    ['árbol de navidad', 'title', 'Árbol De Navidad'],
    ['  extra   spaces\there ', 'kebab', 'extra-spaces-here'],
    ['2fa enabled', 'camel', '2faEnabled'],
    ['', 'snake', ''],
  ] as const)('%j → %s', (input, caseId, expected) => {
    expect(convertCase(input, caseId)).toBe(expected);
  });

  it('strips accents when asked', () => {
    expect(convertCase('Árbol de Navidad', 'snake', { stripAccents: true })).toBe(
      'arbol_de_navidad',
    );
  });

  it('is stable when converting between cases', () => {
    const source = 'parseHttpResponse';
    for (const id of caseIds) {
      if (id === 'lower' || id === 'upper') continue;
      expect(convertCase(convertCase(source, id), 'camel')).toBe(source);
    }
  });
});

describe('convertAllCases', () => {
  it('returns every case in order', () => {
    expect(convertAllCases('parseHTTPResponse')).toEqual([
      { id: 'snake', value: 'parse_http_response' },
      { id: 'kebab', value: 'parse-http-response' },
      { id: 'camel', value: 'parseHttpResponse' },
      { id: 'pascal', value: 'ParseHttpResponse' },
      { id: 'constant', value: 'PARSE_HTTP_RESPONSE' },
      { id: 'title', value: 'Parse Http Response' },
      { id: 'sentence', value: 'Parse http response' },
      { id: 'dot', value: 'parse.http.response' },
      { id: 'path', value: 'parse/http/response' },
      { id: 'lower', value: 'parse http response' },
      { id: 'upper', value: 'PARSE HTTP RESPONSE' },
    ]);
  });
});

describe('convertLines', () => {
  it('converts each line and keeps blank lines', () => {
    expect(convertLines('userId\r\nXMLHttpRequest\n\nfirst name', 'snake')).toBe(
      'user_id\nxml_http_request\n\nfirst_name',
    );
  });
});

describe('helpers', () => {
  it('detects multi-line input ignoring trailing newlines', () => {
    expect(isMultiline('one\n')).toBe(false);
    expect(isMultiline('one\ntwo')).toBe(true);
  });

  it('guards case ids', () => {
    expect(isCaseId('snake')).toBe(true);
    expect(isCaseId('nope')).toBe(false);
  });
});
