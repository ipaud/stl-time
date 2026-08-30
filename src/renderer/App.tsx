import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Box, CircleAlert, FolderOpen, LoaderCircle, Settings as SettingsIcon } from 'lucide-react'
import { ADVENTURER_5M_PRO } from '@shared/printers/adventurer5mpro.js'
import { DEFAULT_SETTINGS, type AppSettings, type SlicerInfo } from '@shared/types.js'
import { formatFileSize } from '@shared/utils/cost.js'
import markUrl from './assets/mark.svg'
import { DropZone } from './components/DropZone.js'
import { ModelViewer } from './components/ModelViewer.js'
import { ResultsPanel } from './components/ResultsPanel.js'
import { Settings } from './components/Settings.js'
import { useFileDrop } from './hooks/useFileDrop.js'
import { InvalidStlError, isStlFile, loadStl } from './lib/stl.js'
import { anyApproximate, detailEstimate, initialState, reducer } from './state.js'
import './styles/global.css'
import './App.css'

const WRONG_TYPE_MESSAGE = 'Only STL files are supported for now.'

export function App(): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [slicer, setSlicer] = useState<SlicerInfo>({ available: false })
  const [showSettings, setShowSettings] = useState(false)

  // Guards against a slow load finishing after the user dropped something else.
  const loadToken = useRef(0)

  useEffect(() => {
    void window.stlTime.getSettings().then(setSettings)
    void window.stlTime.getSlicerInfo().then(setSlicer)
  }, [])

  useEffect(() => window.stlTime.onJobEvent((event) => dispatch({ type: 'job-event', event })), [])

  const open = useCallback(
    async (path: string, name: string, sizeBytes: number, bytes: ArrayBuffer) => {
      const token = ++loadToken.current
      dispatch({ type: 'loading', filename: name })

      try {
        const { geometry, analysis } = loadStl(bytes, name, sizeBytes)
        if (token !== loadToken.current) return

        dispatch({ type: 'analyzed', geometry, analysis })

        const jobId = await window.stlTime.startJob({ path, analysis })
        if (token !== loadToken.current) {
          await window.stlTime.cancelJob(jobId)
          return
        }
        dispatch({ type: 'job-started', jobId })
      } catch (error) {
        if (token !== loadToken.current) return
        const message =
          error instanceof InvalidStlError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Something went wrong reading this file.'
        dispatch({ type: 'error', message })
      }
    },
    [],
  )

  const openFiles = useCallback(
    async (files: FileList) => {
      const file = files[0]
      if (!file) return
      if (!isStlFile(file.name)) {
        dispatch({ type: 'error', message: WRONG_TYPE_MESSAGE })
        return
      }
      try {
        // Only the preload can turn a dropped File into a path for the slicer.
        const path = window.stlTime.pathForFile(file)
        await open(path, file.name, file.size, await file.arrayBuffer())
      } catch {
        // A drop that cannot be resolved to a path must say so, not vanish.
        dispatch({ type: 'error', message: "Couldn't read that file. Try choosing it instead." })
      }
    },
    [open],
  )

  /** Reads a path the main process gave us, then runs the normal load. */
  const openPath = useCallback(
    async (path: string) => {
      try {
        const { name, sizeBytes, bytes } = await window.stlTime.readFile(path)
        await open(path, name, sizeBytes, bytes)
      } catch {
        dispatch({ type: 'error', message: "Couldn't read that file." })
      }
    },
    [open],
  )

  const browse = useCallback(async () => {
    const picked = await window.stlTime.pickFile().catch(() => null)
    if (!picked) return
    await openPath(picked.path)
  }, [openPath])

  useEffect(() => window.stlTime.onOpenPath((path) => void openPath(path)), [openPath])

  const isOver = useFileDrop((files) => void openFiles(files))

  useEffect(
    () =>
      window.stlTime.onMenuEvent((event) => {
        if (event === 'open-file') void browse()
        else setShowSettings(true)
      }),
    [browse],
  )

  const saveSettings = useCallback((next: AppSettings) => {
    void window.stlTime.setSettings(next).then(setSettings)
  }, [])

  const detail = useMemo(() => detailEstimate(state), [state])
  const showApproxNotice = !slicer.available && anyApproximate(state)
  const isBusy = state.status === 'loading' || state.status === 'analyzing'

  return (
    <div className="app">
      <header className="titlebar">
        <div className="titlebar__brand">
          <img className="titlebar__mark" src={markUrl} alt="" width={15} height={17} />
          <span className="titlebar__title">STL Time</span>
          <span className="titlebar__printer">{ADVENTURER_5M_PRO.name}</span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Settings"
          onClick={() => setShowSettings(true)}
        >
          <SettingsIcon size={15} strokeWidth={1.8} />
        </button>
      </header>

      <main className="content">
        {state.analysis ? (
          <>
            <div className="filebar">
              <Box className="filebar__icon" size={14} strokeWidth={1.9} />
              <span className="filebar__name" title={state.analysis.filename}>
                {state.analysis.filename}
              </span>
              <span className="filebar__size">{formatFileSize(state.analysis.fileSizeBytes)}</span>
              <button
                type="button"
                className="text-button filebar__replace"
                onClick={() => void browse()}
              >
                <FolderOpen size={13} strokeWidth={1.9} />
                Replace
              </button>
            </div>

            <div className="stage">
              <ModelViewer geometry={state.geometry} />
              {isOver && <div className="drop-hint">Drop another STL</div>}
            </div>

            {(state.statusMessage || isBusy) && (
              <p className="status">
                <LoaderCircle className="spin" size={12} strokeWidth={2.2} />
                {state.statusMessage || 'Working…'}
              </p>
            )}

            <ResultsPanel
              state={state}
              analysis={state.analysis}
              detail={detail}
              pricePerKg={settings.plaPricePerKg}
              onSelect={(preset) => dispatch({ type: 'select', preset })}
            />

            {showApproxNotice && (
              <p className="notice">
                <CircleAlert size={13} strokeWidth={1.9} />
                Approximate estimate. Install OrcaSlicer for accurate times.
              </p>
            )}
            {detail?.notice && (
              <p className="notice">
                <CircleAlert size={13} strokeWidth={1.9} />
                {detail.notice} Showing an approximate estimate instead.
              </p>
            )}
          </>
        ) : (
          <>
            <DropZone onBrowse={() => void browse()} isOver={isOver} />
            {state.errorMessage && (
              <p className="notice notice--error">
                <CircleAlert size={13} strokeWidth={1.9} />
                {state.errorMessage}
              </p>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <span>
          {ADVENTURER_5M_PRO.manufacturer} {ADVENTURER_5M_PRO.name}
        </span>
        <span className={`footer__engine${slicer.available ? '' : ' is-fallback'}`}>
          <span className="footer__dot" aria-hidden="true" />
          {slicer.available ? `${slicer.name} ${slicer.version}` : 'Approximate estimates'}
        </span>
      </footer>

      {showSettings && (
        <Settings
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
