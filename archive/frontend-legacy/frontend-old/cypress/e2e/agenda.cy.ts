describe('Agenda', () => {
  it('deve mostrar lista de consultas', () => {
    cy.visit('/consultas');
    cy.contains('Consultas');
  });
});
