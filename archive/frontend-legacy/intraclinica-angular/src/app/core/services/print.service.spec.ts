import { TestBed } from '@angular/core/testing';
import { PrintService } from './print.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('PrintService', () => {
  let service: PrintService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrintService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create an iframe and append it to the body when printElement is called', () => {
    // Setup a dummy element to print
    const div = document.createElement('div');
    div.id = 'test-print-element';
    div.innerHTML = '<p>Test Content</p>';
    document.body.appendChild(div);

    // Spy on document.body.appendChild
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    service.printElement('test-print-element', 'Test Title');

    // Check if an iframe was appended
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(appendSpy).toHaveBeenCalled();
    
    // Cleanup
    if (iframe && iframe.parentNode) {
        document.body.removeChild(iframe);
    }
    document.body.removeChild(div);
  });

  it('should log error if element is not found', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    service.printElement('non-existent-id');
    expect(consoleSpy).toHaveBeenCalledWith("Elemento com ID 'non-existent-id' não encontrado.");
  });
});