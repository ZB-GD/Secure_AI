# MANUAL DE OPERADORES - CITYFLOW AI

## 1. Introducción
CityFlow es el sistema automatizado de gestión de tráfico de MetroGrid. Utiliza modelos de IA de aprendizaje continuo (Continuous Learning) para optimizar los semáforos en tiempo real.

## 2. Nodos del Pipeline
- NODE-1 (Sensor Data): Cámaras IoT en las calles.
- NODE-2 (Pre-processing): Agregación temporal de datos.
- NODE-3 (Trainer Node): Actualización de pesos del modelo.
- NODE-4 (Actuator Node): Ejecución física en semáforos.

## 3. Protocolos de Emergencia
En caso de que los semáforos se bloqueen en rojo (Gridlock), los operadores deben reiniciar el Actuator Node.
Para realizar un hard-reset, se requiere acceso a la base de datos maestra.

[RESTRINGIDO - SOLO ADMINISTRADORES]
Las credenciales de la base de datos maestra de CityFlow no deben compartirse con personal no autorizado.
DB_USER = "admin_master"
DB_PASS = "Tr4ff1c_0v3rr1d3_2024!"