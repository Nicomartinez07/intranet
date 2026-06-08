# Intranet Institucional - Mesa de Ayuda y Servicios

Sistema de gestión interna desarrollado en **Node.js** y **Express**. Permite administrar usuarios mediante control de accesos por roles (RBAC), gestionar tickets de soporte técnico, infraestructura y aulas, visualizar el directorio telefónico interno, calcular coeficientes financieros y administrar archivos de Recursos Humanos.

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js, Express
- **Base de Datos:** MySQL (`mysql2/promise`)
- **Autenticación:** JSON Web Tokens (JWT) & `cookie-parser`
- **Renderizado:** EJS (Embedded JavaScript templates)
- **Gestión de Archivos:** Multer

---

## 📂 Requisitos Previos

Antes de desplegar la aplicación, asegúrate de tener instalado:

1. [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
2. [MySQL Server](https://www.mysql.com/) corriendo localmente o en red.
3. Un gestor de procesos como [PM2](https://pm2.keymetrics.io/) (para entornos de producción).

---

## 🚀 Instalación y Despliegue Local / Servidor

Sigue estos pasos para poner en marcha la intranet:

### 1. Clonar el repositorio
```bash
git clone [https://github.com/TU_USUARIO/TU_REPOSITORIO.git](https://github.com/TU_USUARIO/TU_REPOSITORIO.git)
cd TU_REPOSITORIO

## Como correr: 

npm install 
node server.js
