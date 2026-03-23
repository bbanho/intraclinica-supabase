import { Component, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-wiki',
  standalone: true,
  template: `<div class="p-8 text-center text-slate-500">Carregando wiki...</div>`
})
export class WikiComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    window.location.href = '/wiki';
  }
}
