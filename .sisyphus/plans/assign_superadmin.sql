-- SQL para atribuir Role 'superadmin' ao usuário
-- Substitua 'USER_UUID' pelo ID real do usuário motto@axio.eng.br (veja na tabela auth.users)

-- 1. Descobrir o ID do usuário (se tiver acesso de leitura a auth.users, senão precisa pegar na UI)
-- select id from auth.users where email = 'motto@axio.eng.br';

-- 2. Atualizar a tabela app_user (que espelha auth.users)
-- Assumindo que app_user.role existe (conforme Handover Report)
update public.app_user
set role = 'superadmin'
where email = 'motto@axio.eng.br';

-- 3. (Opcional) Se existir uma tabela de roles separada:
-- insert into user_roles (user_id, role) values ((select id from auth.users where email='motto@axio.eng.br'), 'superadmin');

-- NOTA: O sistema atual usa 'role' como coluna enum ou texto em app_user?
-- Verificando schema atual...
