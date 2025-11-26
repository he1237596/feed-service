import { Helpers } from '../../utils/helpers';
import fs from 'fs';
import path from 'path';

describe('Helpers', () => {
  describe('generateId', () => {
    it('should generate a UUID', () => {
      const id = Helpers.generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = Helpers.generateId();
      const id2 = Helpers.generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateHash', () => {
    it('should generate consistent hash for same input', () => {
      const input = 'test input';
      const hash1 = Helpers.generateHash(input);
      const hash2 = Helpers.generateHash(input);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = Helpers.generateHash('input1');
      const hash2 = Helpers.generateHash('input2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isValidVersion', () => {
    it('should validate semantic versions', () => {
      expect(Helpers.isValidVersion('1.0.0')).toBe(true);
      expect(Helpers.isValidVersion('1.2.3')).toBe(true);
      expect(Helpers.isValidVersion('10.20.30')).toBe(true);
      expect(Helpers.isValidVersion('1.0.0-alpha')).toBe(true);
      expect(Helpers.isValidVersion('1.0.0-beta.1')).toBe(true);
      expect(Helpers.isValidVersion('1.0.0+build.1')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(Helpers.isValidVersion('1')).toBe(false);
      expect(Helpers.isValidVersion('1.2')).toBe(false);
      expect(Helpers.isValidVersion('v1.0.0')).toBe(false);
      expect(Helpers.isValidVersion('')).toBe(false);
      expect(Helpers.isValidVersion('not.a.version')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(Helpers.compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(Helpers.compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(Helpers.compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(Helpers.compareVersions('2.0.0', '1.9.9')).toBe(1);
    });
  });

  describe('getLatestVersion', () => {
    it('should return the highest version', () => {
      const versions = ['1.0.0', '1.0.1', '1.1.0', '2.0.0'];
      const latest = Helpers.getLatestVersion(versions);
      expect(latest).toBe('2.0.0');
    });

    it('should return null for empty array', () => {
      const latest = Helpers.getLatestVersion([]);
      expect(latest).toBeNull();
    });
  });

  describe('sanitizePackageName', () => {
    it('should sanitize package names', () => {
      expect(Helpers.sanitizePackageName('My Package Name')).toBe('my-package-name');
      expect(Helpers.sanitizePackageName('Test@Package#Name')).toBe('test-package-name');
      expect(Helpers.sanitizePackageName('already-sanitized')).toBe('already-sanitized');
      expect(Helpers.sanitizePackageName('---Multiple---Dashes---')).toBe('multiple-dashes');
      expect(Helpers.sanitizePackageName('--LeadingAndTrailing--')).toBe('leadingandtrailing');
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', () => {
      const testDir = path.join(__dirname, 'test-dir');
      
      // Ensure directory doesn't exist
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }

      Helpers.ensureDirectory(testDir);
      expect(fs.existsSync(testDir)).toBe(true);

      // Clean up
      fs.rmSync(testDir, { recursive: true });
    });

    it('should not error if directory already exists', () => {
      const testDir = path.join(__dirname, 'test-dir-2');
      
      // Create directory first
      Helpers.ensureDirectory(testDir);
      
      // Should not throw
      expect(() => Helpers.ensureDirectory(testDir)).not.toThrow();

      // Clean up
      fs.rmSync(testDir, { recursive: true });
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(Helpers.formatFileSize(1024)).toBe('1.00 KB');
      expect(Helpers.formatFileSize(1048576)).toBe('1.00 MB');
      expect(Helpers.formatFileSize(1073741824)).toBe('1.00 GB');
      expect(Helpers.formatFileSize(500)).toBe('500.00 B');
      expect(Helpers.formatFileSize(1536)).toBe('1.50 KB');
    });
  });

  describe('generateSafeFilename', () => {
    it('should generate safe filenames', () => {
      const filename = Helpers.generateSafeFilename('package.tgz');
      expect(filename).toMatch(/^package-\d+-[a-z0-9]+\.tgz$/);
    });

    it('should preserve original extension', () => {
      const filename = Helpers.generateSafeFilename('test.tar.gz');
    //   expect(filename).toEndWith('.tar.gz');
      expect(filename.endsWith('.tar.gz')).toBe(true)
    });

    it('should generate unique filenames', () => {
      const filename1 = Helpers.generateSafeFilename('package.tgz');
      const filename2 = Helpers.generateSafeFilename('package.tgz');
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('paginate', () => {
    it('should paginate array correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = Helpers.paginate(array, 2, 3);

      expect(result.items).toEqual([4, 5, 6]);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(4);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle edge cases', () => {
      const array = [1, 2, 3];
      
      // First page
      const first = Helpers.paginate(array, 1, 3);
      expect(first.hasPrev).toBe(false);
      expect(first.hasNext).toBe(false);

      // Empty array
      const empty = Helpers.paginate([], 1, 10);
      expect(empty.items).toEqual([]);
      expect(empty.total).toBe(0);
    });
  });

  describe('cleanString', () => {
    it('should clean strings', () => {
      expect(Helpers.cleanString('  test   string  ')).toBe('test string');
      expect(Helpers.cleanString('\n  test\n\nstring  \t')).toBe('test string');
    });
  });

  describe('isEmpty', () => {
    it('should check if string is empty', () => {
      expect(Helpers.isEmpty('')).toBe(true);
      expect(Helpers.isEmpty('   ')).toBe(true);
      expect(Helpers.isEmpty('\t\n')).toBe(true);
      expect(Helpers.isEmpty('test')).toBe(false);
      expect(Helpers.isEmpty(' test ')).toBe(false);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(Helpers.getMimeType('package.json')).toBe('application/json');
      expect(Helpers.getMimeType('package.tgz')).toBe('application/gzip');
      expect(Helpers.getMimeType('script.js')).toBe('application/javascript');
      expect(Helpers.getMimeType('style.css')).toBe('text/css');
      expect(Helpers.getMimeType('unknown.xyz')).toBe('application/octet-stream');
    });
  });

  describe('getClientIp', () => {
    it('should extract IP address from request', () => {
      const mockReq = {
        ip: '192.168.1.1'
      };
      expect(Helpers.getClientIp(mockReq)).toBe('192.168.1.1');

      const mockReq2 = {
        ip: null,
        connection: { remoteAddress: '192.168.1.2' }
      };
      expect(Helpers.getClientIp(mockReq2)).toBe('192.168.1.2');
    });
  });

  describe('getUserAgent', () => {
    it('should extract user agent from request', () => {
      const mockReq = {
        get: (header: string) => header === 'User-Agent' ? 'Mozilla/5.0' : undefined
      };
      expect(Helpers.getUserAgent(mockReq)).toBe('Mozilla/5.0');

      const mockReq2 = {
        get: () => undefined
      };
      expect(Helpers.getUserAgent(mockReq2)).toBe('Unknown');
    });
  });

  describe('isValidFileType', () => {
    it('should validate file types', () => {
      const allowedTypes = ['.tgz', '.tar.gz', '.json'];
      
      expect(Helpers.isValidFileType('package.tgz', allowedTypes)).toBe(true);
      expect(Helpers.isValidFileType('package.tar.gz', allowedTypes)).toBe(true);
      expect(Helpers.isValidFileType('config.json', allowedTypes)).toBe(true);
      expect(Helpers.isValidFileType('package.zip', allowedTypes)).toBe(false);
    });
  });

  describe('randomString', () => {
    it('should generate random string of specified length', () => {
      const str = Helpers.randomString(10);
      expect(str).toHaveLength(10);
      expect(/^[A-Za-z0-9]+$/.test(str)).toBe(true);
    });

    it('should generate unique strings', () => {
      const str1 = Helpers.randomString(10);
      const str2 = Helpers.randomString(10);
      expect(str1).not.toBe(str2);
    });
  });

  describe('deepClone', () => {
    it('should create deep copy of object', () => {
      const original = { a: 1, b: { c: 2, d: [3, 4] } };
      const cloned = Helpers.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.b.d).not.toBe(original.b.d);

      // Modify clone should not affect original
      cloned.b.c = 99;
      expect(original.b.c).toBe(2);
    });
  });

  describe('removeUndefined', () => {
    it('should remove undefined values from object', () => {
      const obj = {
        a: 1,
        b: undefined,
        c: 'test',
        d: null,
        e: undefined
      };

      const cleaned = Helpers.removeUndefined(obj);
      expect(cleaned).toEqual({
        a: 1,
        c: 'test',
        d: null
      });
    });
  });
});