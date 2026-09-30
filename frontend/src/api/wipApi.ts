import { getProductionRuns, getProductionStages } from './productionApi'
import { getActiveMachines } from './machineApi'
import type {
  ActiveMachineResponse,
  ProductionStageResponse,
  WipProductionRunGroup,
  WipStageItem,
  WipSummaryMetrics,
  WipViewData,
} from '../types'

/**
 * Derives comprehensive Work In Progress (WIP) data from real production runs and stages.
 * If the core production runs endpoint fails, this function throws so that the UI can
 * display a proper error state rather than false zero metrics or a fake empty state.
 */
export async function getWipViewData(): Promise<WipViewData> {
  // 1. Fetch production runs (CORE data - errors must propagate)
  const runs = await getProductionRuns()
  if (!Array.isArray(runs)) {
    throw new Error('Invalid production runs response format')
  }

  // 2. Fetch active machines (OPTIONAL enrichment - failure does not block WIP)
  let activeMachines: ActiveMachineResponse[] = []
  try {
    const machines = await getActiveMachines()
    if (Array.isArray(machines)) {
      activeMachines = machines
    }
  } catch {
    // Machine enrichment failure is non-fatal
  }

  // Create machine code to name map for enrichment if needed
  const machineNameMap = new Map<string, string>()
  activeMachines.forEach((m) => {
    if (m.machineCode) {
      machineNameMap.set(m.machineCode, m.machineName)
    }
  })

  // 3. Fetch stages for all runs in parallel (graceful per-run)
  const stagePromises = runs.map(async (run) => {
    try {
      const stages = await getProductionStages(run.productionId)
      return { run, stages: Array.isArray(stages) ? stages : [], stagesError: false }
    } catch {
      return { run, stages: [] as ProductionStageResponse[], stagesError: true }
    }
  })

  const runWithStages = await Promise.all(stagePromises)

  // 4. Process each stage into WipStageItem
  const allWipItems: WipStageItem[] = []
  const runGroups: WipProductionRunGroup[] = []
  const unitsSet = new Set<string>()
  const machinesSet = new Set<string>()
  const runNumbersSet = new Set<string>()
  const involvedMachinesSet = new Set<string>()

  let runningStagesCount = 0
  let readyStagesCount = 0
  let pendingStagesCount = 0
  let completedStagesCount = 0
  let totalInputWeightKg = 0
  let totalOutputWeightKg = 0
  let totalScrapWeightKg = 0
  let totalCalculableWipKg = 0
  let hasCalculableWip = false

  runWithStages.forEach(({ run, stages, stagesError }) => {
    if (run.productionNumber) {
      runNumbersSet.add(run.productionNumber)
    }

    const sortedStages = [...stages].sort((a, b) => a.sequenceNo - b.sequenceNo)

    const runStageItems: WipStageItem[] = sortedStages.map((stage) => {
      const input = Number(stage.inputWeightKg) || 0
      const output = Number(stage.outputWeightKg) || 0
      const scrap = Number(stage.scrapWeightKg) || 0

      totalInputWeightKg += input
      totalOutputWeightKg += output
      totalScrapWeightKg += scrap

      const status = stage.status || 'Pending'
      if (status === 'Running') runningStagesCount++
      else if (status === 'Ready') readyStagesCount++
      else if (status === 'Pending') pendingStagesCount++
      else if (status === 'Completed') completedStagesCount++

      // Machine and Unit tracking
      const machineCode = stage.machineCode || null
      const machineName = stage.machineName || (machineCode ? machineNameMap.get(machineCode) : null) || null
      const unitCode = stage.unitCode || null
      const unitName = stage.unitName || null

      if (unitCode) unitsSet.add(unitCode)
      if (unitName) unitsSet.add(unitName)
      if (machineCode) {
        machinesSet.add(machineCode)
        if (['Running', 'Ready'].includes(status) || run.status !== 'Completed') {
          involvedMachinesSet.add(machineName ? `${machineName} (${machineCode})` : machineCode)
        }
      }

      // Calculate stage-level WIP weight if applicable
      let wipWeightKg: number | null = null
      if (['Running', 'Ready'].includes(status)) {
        if (input > 0) {
          wipWeightKg = Math.max(0, input - output - scrap)
          totalCalculableWipKg += wipWeightKg
          hasCalculableWip = true
        }
      }

      const item: WipStageItem = {
        productionId: run.productionId,
        productionNumber: run.productionNumber,
        plantName: run.plantName,
        runStatus: run.status,
        plannedQty: run.plannedQty,
        actualQty: run.actualQty,
        stageId: stage.stageId,
        sequenceNo: stage.sequenceNo,
        stageName: stage.stageName || `Stage ${stage.sequenceNo}`,
        status,
        unitCode,
        unitName,
        machineCode,
        machineName,
        inputWeightKg: input,
        outputWeightKg: output,
        scrapWeightKg: scrap,
        wipWeightKg,
        startedAt: stage.startedAt,
        completedAt: stage.completedAt,
      }

      allWipItems.push(item)
      return item
    })

    // Calculate run-level WIP
    let runWipWeightKg: number | null = null
    const runInput = run.inputWeightKg != null ? Number(run.inputWeightKg) : null
    const runOutput = run.outputWeightKg != null ? Number(run.outputWeightKg) : null
    const runScrap = run.scrapWeightKg != null ? Number(run.scrapWeightKg) : 0

    if (runInput != null && run.status !== 'Completed') {
      runWipWeightKg = Math.max(0, runInput - (runOutput || 0) - runScrap)
    }

    // Determine current active stage for this run
    const runningStage = runStageItems.find((s) => s.status === 'Running')
    const readyStage = runStageItems.find((s) => s.status === 'Ready')
    const pendingStage = runStageItems.find((s) => s.status === 'Pending')
    const lastCompleted = [...runStageItems].reverse().find((s) => s.status === 'Completed')

    const currentStage = runningStage || readyStage || pendingStage || lastCompleted || null

    runGroups.push({
      productionId: run.productionId,
      productionNumber: run.productionNumber,
      plantName: run.plantName,
      runStatus: run.status,
      plannedQty: run.plannedQty,
      actualQty: run.actualQty,
      inputWeightKg: run.inputWeightKg,
      outputWeightKg: run.outputWeightKg,
      scrapWeightKg: run.scrapWeightKg,
      yieldPercentage: run.yieldPercentage,
      currentStage,
      stages: runStageItems,
      runWipWeightKg,
      stagesError,
    })
  })

  // 5. Summarize active runs count
  const activeRunsCount = runs.filter(
    (r) => r.status === 'InProgress' || (r.status !== 'Completed' && r.status !== 'Cancelled')
  ).length

  const metrics: WipSummaryMetrics = {
    activeRunsCount,
    totalRunsCount: runs.length,
    runningStagesCount,
    readyStagesCount,
    pendingStagesCount,
    completedStagesCount,
    totalWipWeightKg: hasCalculableWip ? totalCalculableWipKg : null,
    totalInputWeightKg,
    totalOutputWeightKg,
    totalScrapWeightKg,
    activeMachinesCount: involvedMachinesSet.size,
    involvedMachinesList: Array.from(involvedMachinesSet),
  }

  return {
    metrics,
    items: allWipItems,
    runGroups,
    availableUnits: Array.from(unitsSet).sort(),
    availableMachines: Array.from(machinesSet).sort(),
    availableRunNumbers: Array.from(runNumbersSet).sort(),
  }
}
