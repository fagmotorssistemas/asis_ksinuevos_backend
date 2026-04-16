-- =============================================================================
-- QUERIES ORACLE: Cheques a futuro e Ingresos/Egresos por cheque
-- Proyecto: asis_ksinuevos_backend - Módulo Cobros
-- =============================================================================
-- Código tipo pago CHEQUE (usado en drecibo): 10001347
-- Empresa por defecto: 162
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) COBROS POR CHEQUE CON FECHA DE PAGO O VENCIMIENTO A FUTURO
--    (Desde la vista ksi_cobros_v - mismo origen que el listado actual)
--    Son los cobros ya registrados donde el medio de pago es CHEQUE y la fecha
--    de pago o vencimiento es hoy o futura.
-- -----------------------------------------------------------------------------
SELECT
    TIPO_DOCUMENTO,
    COMPROBANTE_PAGO,
    FECHA_PAGO,
    TIPO_PAGO,
    COD_CLIENTE,
    CLIENTE,
    COMPROBANTE_DEUDA,
    DOCUMENTO_FACTURA,
    VEHICULO,
    CUOTA,
    FECHA_VENCIMIENTO,
    VALOR_CANCELA,
    CONCEPTO,
    CCO_CODIGO
FROM ksi_cobros_v
WHERE UPPER(NVL(TIPO_PAGO, ' ')) LIKE '%CHEQUE%'
  AND (TRUNC(FECHA_PAGO) >= TRUNC(SYSDATE)
       OR TRUNC(FECHA_VENCIMIENTO) >= TRUNC(SYSDATE))
ORDER BY FECHA_PAGO ASC, FECHA_VENCIMIENTO ASC;


-- -----------------------------------------------------------------------------
-- 2) INGRESOS Y EGRESOS POR CHEQUE (movimientos financieros)
--    Desde CCOMPROBA/CCOMPROBA1. Incluye documento (ej. número de cheque),
--    monto, y si es INGRESO (DEBCRE=1) o EGRESO (DEBCRE=2).
--    Opción A: Solo movimientos con fecha futura (cheques a cobrar/pagar)
-- -----------------------------------------------------------------------------
SELECT
    Cab.CCO_FECHA          AS FECHA,
    Cab.CCO_CONCEPTO       AS CONCEPTO,
    Det.CCO1_BENEFICIARIO  AS BENEFICIARIO,
    Det.CCO1_DOCUMENTO     AS DOCUMENTO_CHEQUE,
    Det.CCO1_VALOR_NAC     AS MONTO,
    CASE WHEN Det.CCO1_DEBCRE = 1 THEN 'INGRESO' ELSE 'EGRESO' END AS TIPO_MOVIMIENTO
FROM DATA_USR.CCOMPROBA Cab
INNER JOIN DATA_USR.CCOMPROBA1 Det
    ON Cab.CCO_CODIGO = Det.CCO1_CCO_COMPROBA
WHERE Cab.CCO_EMPRESA = 162
  AND Cab.CCO_ANULADO = 0
  AND UPPER(NVL(Det.CCO1_DOCUMENTO, ' ')) LIKE '%CHEQUE%'
  AND TRUNC(Cab.CCO_FECHA) >= TRUNC(SYSDATE)
ORDER BY Cab.CCO_FECHA ASC;


-- -----------------------------------------------------------------------------
-- 2b) INGRESOS Y EGRESOS POR CHEQUE – TODOS (histórico + futuro)
--     Para ver todos los movimientos por cheque, quitar el filtro de fecha.
-- -----------------------------------------------------------------------------
SELECT
    Cab.CCO_FECHA          AS FECHA,
    Cab.CCO_CONCEPTO       AS CONCEPTO,
    Det.CCO1_BENEFICIARIO  AS BENEFICIARIO,
    Det.CCO1_DOCUMENTO     AS DOCUMENTO_CHEQUE,
    Det.CCO1_VALOR_NAC     AS MONTO,
    CASE WHEN Det.CCO1_DEBCRE = 1 THEN 'INGRESO' ELSE 'EGRESO' END AS TIPO_MOVIMIENTO
FROM DATA_USR.CCOMPROBA Cab
INNER JOIN DATA_USR.CCOMPROBA1 Det
    ON Cab.CCO_CODIGO = Det.CCO1_CCO_COMPROBA
WHERE Cab.CCO_EMPRESA = 162
  AND Cab.CCO_ANULADO = 0
  AND UPPER(NVL(Det.CCO1_DOCUMENTO, ' ')) LIKE '%CHEQUE%'
ORDER BY Cab.CCO_FECHA DESC;


-- -----------------------------------------------------------------------------
-- 3) CHEQUES PROGRAMADOS A FUTURO (drecibo – vencimiento a futuro)
--    Pagos con tipo CHEQUE (10001347) cuya fecha de vencimiento es hoy o
--    futura. Son los cheques que “van a ingresar” cuando se cobren.
-- -----------------------------------------------------------------------------
SELECT
    TO_CHAR(d.dfp_cco_comproba)        AS CCO_RECIBO,
    r.CCO_FECHA                         AS FECHA_COMPROBANTE,
    NVL(d.dfp_fecha_ven, r.CCO_FECHA)  AS FECHA_VENCIMIENTO,
    d.dfp_monto                         AS MONTO,
    a.CFAC_cco_comproba                 AS CCO_CONTRATO
FROM DATA_USR.ccomfac a
JOIN DATA_USR.drecibo d
    ON a.cfac_cco_recibo = d.dfp_cco_comproba
   AND a.cfac_empresa   = d.dfp_empresa
JOIN DATA_USR.ccomproba r
    ON r.cco_codigo = d.dfp_cco_comproba
   AND r.cco_empresa = d.dfp_empresa
WHERE a.cfac_empresa = 162
  AND d.dfp_tipopago = 10001347   /* CHEQUE */
  AND TRUNC(NVL(d.dfp_fecha_ven, r.CCO_FECHA)) >= TRUNC(SYSDATE)
ORDER BY NVL(d.dfp_fecha_ven, r.CCO_FECHA) ASC;


-- -----------------------------------------------------------------------------
-- 4) RESUMEN: Total ingresos vs egresos por cheque (a futuro)
-- -----------------------------------------------------------------------------
SELECT
    CASE WHEN Det.CCO1_DEBCRE = 1 THEN 'INGRESO' ELSE 'EGRESO' END AS TIPO_MOVIMIENTO,
    COUNT(*) AS CANTIDAD,
    SUM(Det.CCO1_VALOR_NAC) AS TOTAL
FROM DATA_USR.CCOMPROBA Cab
INNER JOIN DATA_USR.CCOMPROBA1 Det
    ON Cab.CCO_CODIGO = Det.CCO1_CCO_COMPROBA
WHERE Cab.CCO_EMPRESA = 162
  AND Cab.CCO_ANULADO = 0
  AND UPPER(NVL(Det.CCO1_DOCUMENTO, ' ')) LIKE '%CHEQUE%'
  AND TRUNC(Cab.CCO_FECHA) >= TRUNC(SYSDATE)
GROUP BY Det.CCO1_DEBCRE, CASE WHEN Det.CCO1_DEBCRE = 1 THEN 'INGRESO' ELSE 'EGRESO' END;
