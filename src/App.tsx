import { ReactNode } from 'react'
import { sortableDataFrame } from 'hightable'
import { byteLengthFromUrl, parquetMetadataAsync } from 'hyparquet'
import { asyncBufferFrom, parquetDataFrame } from 'hyperparam'
import { useCallback, useEffect, useState } from 'react'

import Layout from './Layout.js'
import Page, { DataSet } from './Page.js'

const parquetUrls = import.meta.glob('./parquets/*.parquet', { 
  eager: true, 
  query: '?url', 
  import: 'default' 
}) as Record<string, string>

const loadDataSet = async (path: string, url: string): Promise<DataSet> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const name = path.split('/').pop() ?? path
  const file = new File([await res.blob()], name)
  const from = { file, byteLength: file.size }
  const asyncBuffer = await asyncBufferFrom(from)
  const metadata = await parquetMetadataAsync(asyncBuffer)
  const df = sortableDataFrame(parquetDataFrame(from, metadata))
  return { metadata, df, name, byteLength: file.size }
}

export default function App(): ReactNode {
  const [error, setError] = useState<Error>()
  const [dataSets, setDataSets] = useState<DataSet[]>([])

  const setUnknownError = useCallback((e: unknown) => {
    setError(e instanceof Error ? e : new Error(String(e)))
  }, [])


  useEffect(() => {
   Promise.all(Object.entries(parquetUrls).map(([path, url]) => loadDataSet(path, url)))
   .then(setDataSets)
   .catch(setUnknownError)
  }, [setUnknownError])

  return <Layout error={error}>
    <Page dataSets={dataSets} setError={setUnknownError} />
  </Layout>
}
