-- Script para inicializar datos de una nueva empresa
-- Reemplazar <ID_EMPRESA> con el ID de la nueva empresa

-- Categorías por defecto
INSERT IGNORE INTO categorias (nombre, descripcion, id_empresa) VALUES
('Bebidas', 'Gaseosas, jugos, aguas, cervezas', <ID_EMPRESA>),
('Alimentos', 'Comestibles en general', <ID_EMPRESA>),
('Limpieza', 'Productos de limpieza', <ID_EMPRESA>),
('Perfumeria', 'Productos de higiene personal', <ID_EMPRESA>),
('Lacteos', 'Leche, yogures, quesos', <ID_EMPRESA>);

-- Cliente por defecto
INSERT IGNORE INTO clientes (nombre, tipo, id_empresa) VALUES
('CONSUMIDOR FINAL', 'CONSUMIDOR FINAL', <ID_EMPRESA>);
