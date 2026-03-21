import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import JsBarcode from 'jsbarcode';

@Directive({
  selector: '[appBarcode]',
  standalone: true
})
export class BarcodeDirective implements OnChanges {
  @Input({ required: true }) appBarcode!: string;
  @Input() options: any = {};

  constructor(private el: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appBarcode'] && this.appBarcode) {
      this.generate();
    }
  }

  private generate() {
    try {
      JsBarcode(this.el.nativeElement, this.appBarcode, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 12,
        margin: 0,
        ...this.options
      });
    } catch (e) {
      console.warn('Barcode generation failed', e);
    }
  }
}