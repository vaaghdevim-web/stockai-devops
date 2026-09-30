import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getDefaultRouteForRoles } from '../config/rbac'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
import { AppLayout } from '../layouts/AppLayout'

// Page Components
import { LoginPage } from '../pages/LoginPage'
import { DashboardPage } from '../pages/DashboardPage'
import { AlertsPage } from '../pages/AlertsPage'
import { ReportsPage, AuditPage, DocumentsPage, IntegrationsPage } from '../pages/InsightsPages'
import { RawMaterialsPage } from '../pages/inventory/RawMaterialsPage'
import { MaterialBatchesPage } from '../pages/inventory/MaterialBatchesPage'
import { BatchTraceabilityPage } from '../pages/inventory/BatchTraceabilityPage'
import { ReorderRecommendationsPage } from '../pages/procurement/ReorderRecommendationsPage'
import { SuppliersPage } from '../pages/procurement/SuppliersPage'
import { WarehouseMapPage } from '../pages/warehouse/WarehouseMapPage'
import { StockTransfersPage } from '../pages/warehouse/StockTransfersPage'
import { PalletsPage } from '../pages/warehouse/PalletsPage'
import { ProductionPage } from '../pages/production/ProductionPage'
import { WorkInProgressPage } from '../pages/production/WorkInProgressPage'
import { ProductionStagePage } from '../pages/production/ProductionStagePage'
import { CompoundingBomPage } from '../pages/production/CompoundingBomPage'
import { BomRequirementCalculatorPage } from '../pages/production/BomRequirementCalculatorPage'
import { QualityInspectionsPage } from '../pages/quality/QualityInspectionsPage'
import { QualityInspectionDetailPage } from '../pages/quality/QualityInspectionDetailPage'
import { QcSpecificationsPage } from '../pages/quality/QcSpecificationsPage'
import { DispatchPage } from '../pages/dispatch/DispatchPage'
import { MachinesPage } from '../pages/machines/MachinesPage'
import { MachineDetailsPage } from '../pages/machines/MachineDetailsPage'
import { LiveTelemetryPage } from '../pages/telemetry/LiveTelemetryPage'
import { AccessDeniedPage } from '../pages/AccessDeniedPage'

export function AppRoutes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const roles = useAuthStore((state) => state.roles)
  const landingRoute = getDefaultRouteForRoles(roles)

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={landingRoute} replace /> : <LoginPage />}
        />

        {/* Authenticated Protected Shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Access Denied Routes */}
            <Route path="/403" element={<AccessDeniedPage />} />
            <Route path="/unauthorized" element={<AccessDeniedPage />} />

            {/* 1. MAIN */}
            <Route element={<RoleRoute pageKey="dashboard" />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="alerts" />}>
              <Route path="/alerts" element={<AlertsPage />} />
            </Route>

            {/* 2. INSIGHTS */}
            <Route element={<RoleRoute pageKey="reports" />}>
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="audit" />}>
              <Route path="/audit" element={<AuditPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="documents" />}>
              <Route path="/documents" element={<DocumentsPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="integrations" />}>
              <Route path="/integrations" element={<IntegrationsPage />} />
            </Route>

            {/* 3. INVENTORY */}
            <Route element={<RoleRoute pageKey="rawMaterials" />}>
              <Route path="/inventory/raw-materials" element={<RawMaterialsPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="materialBatches" />}>
              <Route path="/inventory/batches" element={<MaterialBatchesPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="trackBatch" />}>
              <Route path="/traceability" element={<BatchTraceabilityPage />} />
            </Route>

            {/* 4. PROCUREMENT */}
            <Route element={<RoleRoute pageKey="needToBuy" />}>
              <Route path="/procurement/reorder-recommendations" element={<ReorderRecommendationsPage />} />
              <Route path="/procurement/suppliers" element={<SuppliersPage />} />
            </Route>

            {/* 5. WAREHOUSE */}
            <Route element={<RoleRoute pageKey="digitalTwin" />}>
              <Route path="/warehouse/map" element={<WarehouseMapPage />} />
              <Route path="/warehouse/digital-twin" element={<WarehouseMapPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="moveStock" />}>
              <Route path="/warehouse/transfers" element={<StockTransfersPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="pallets" />}>
              <Route path="/warehouse/pallets" element={<PalletsPage />} />
            </Route>

            {/* 6. PRODUCTION */}
            <Route element={<RoleRoute pageKey="productionWork" />}>
              <Route path="/production" element={<ProductionPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="currentWork" />}>
              <Route path="/production/wip" element={<WorkInProgressPage />} />
              <Route path="/production/:productionId/stages/:stageId" element={<ProductionStagePage />} />
            </Route>
            <Route element={<RoleRoute pageKey="compoundingBom" />}>
              <Route path="/production/bom" element={<CompoundingBomPage />} />
              <Route path="/production/bom/:bomId/requirements" element={<BomRequirementCalculatorPage />} />
            </Route>

            {/* 7. QUALITY */}
            <Route element={<RoleRoute pageKey="qualityCheck" />}>
              <Route path="/quality/inspections" element={<QualityInspectionsPage />} />
              <Route path="/quality/inspections/:inspectionId" element={<QualityInspectionDetailPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="qcSpecifications" />}>
              <Route path="/quality/specifications" element={<QcSpecificationsPage />} />
            </Route>

            {/* 8. DISPATCH */}
            <Route element={<RoleRoute pageKey="dispatch" />}>
              <Route path="/dispatch" element={<DispatchPage />} />
            </Route>

            {/* 9. MACHINES */}
            <Route element={<RoleRoute pageKey="machines" />}>
              <Route path="/machines" element={<MachinesPage />} />
              <Route path="/machines/:machineCode" element={<MachineDetailsPage />} />
            </Route>
            <Route element={<RoleRoute pageKey="machineLiveStatus" />}>
              <Route path="/telemetry" element={<LiveTelemetryPage />} />
            </Route>
          </Route>
        </Route>

        {/* Root Redirect */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? landingRoute : '/login'} replace />}
        />

        {/* Catch-all Wildcard Route */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/403' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}
