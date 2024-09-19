'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Eye, EyeOff, Filter, ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
type XMLData = {
  [key: string]: string | object []
}

export default function XmlDataViewer() {
  const [xmlData, setXmlData] = useState<XMLData[]>([])
  const [allColumns, setAllColumns] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [excludedColumns, setExcludedColumns] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100
  const tableRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const savedColumns = localStorage.getItem('visibleColumns')
    if (savedColumns) {
      setVisibleColumns(JSON.parse(savedColumns))
    }
  }, [])

  const toggleColumn = (column: string) => {
    if (visibleColumns.includes(column)) {
      const updatedVisible = visibleColumns.filter(col => col !== column)
      setVisibleColumns(updatedVisible)
      setExcludedColumns([...excludedColumns, column])
      localStorage.setItem('visibleColumns', JSON.stringify(updatedVisible))
    } else {
      const columnIndex = allColumns.indexOf(column)
      const updatedVisible = [...visibleColumns]
      updatedVisible.splice(columnIndex, 0, column)
      setVisibleColumns(updatedVisible)
      setExcludedColumns(excludedColumns.filter(col => col !== column))
      localStorage.setItem('visibleColumns', JSON.stringify(updatedVisible))
    }
  }

  const toggleFilter = (column: string) => {
    setSelectedColumn(column === selectedColumn ? null : column)
  }

  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === column && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key: column, direction })
  }

  const sortedData = React.useMemo(() => {
    const sortableItems = [...xmlData]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [xmlData, sortConfig])

  const filteredData = sortedData.filter(item => {
    const matchesSearch = Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
    const matchesColumn = !selectedColumn || (item[selectedColumn] && String(item[selectedColumn]).trim() !== '')
    return matchesSearch && matchesColumn
  })

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        try {
          const parser = new DOMParser()
          const xmlDoc = parser.parseFromString(content, "text/xml")
          const tables = xmlDoc.getElementsByTagName("Table1")
          const parsedData: XMLData[] = []

          for (let i = 0; i < tables.length; i++) {
            const table = tables[i]
            const tableData: XMLData = {}
            for (let j = 0; j < table.children.length; j++) {
              const child = table.children[j]
              tableData[child.tagName] = child.textContent || ''
            }
            parsedData.push(tableData)
          }

          setXmlData(parsedData)
          const columns = Object.keys(parsedData[0] || {})
          setAllColumns(columns)
          setVisibleColumns(columns)
          setExcludedColumns([])
          setError(null)
        } catch (err) {
          setError("Error parsing XML file. Please make sure it's a valid XML." + err)
        }
      }
      reader.readAsText(file, 'UTF-8')
    }
  }

  const formatColumnName = (name: string) => {
    const parts = name.split('.')
    return parts.length > 1 ? (
      <div className="flex flex-col">
        <span>{parts[0]}</span>
        <span className="text-xs text-gray-500">{parts.slice(1).join('.')}</span>
      </div>
    ) : name
  }
  const TruncatedCell = ({ content }: { content: string }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const maxLength = 50  // Ajusta este valor según tus necesidades

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? content : `${content.slice(0, maxLength)}${content.length > maxLength ? '...' : ''}`}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  useEffect(() => {
    const handleScroll = () => {
      if (tableRef.current) {
        const { scrollLeft } = tableRef.current
        const header = tableRef.current.querySelector('thead') as HTMLTableSectionElement
        if (header) {
          header.style.transform = `translateX(-${scrollLeft}px)`
        }
      }
    }

    const tableElement = tableRef.current
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll)
    }

    return () => {
      if (tableElement) {
        tableElement.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">XML Data Viewer 4</h1>
      <div className="mb-4">
        <Input
          type="file"
          accept=".xml"
          onChange={handleFileUpload}
          className="mb-2"
        />
        <p className="text-sm text-gray-500">Please select an XML file to upload.</p>
      </div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {xmlData.length > 0 && (
        <>
          <Input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          {excludedColumns.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Excluded Columns:</h2>
              <div className="flex flex-wrap gap-2">
                {excludedColumns.map(column => (
                  <Badge
                    key={column}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleColumn(column)}
                  >
                    {column}
                    <Eye className="ml-2 h-4 w-4" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
           <div 
            ref={tableRef}
            className="overflow-auto max-h-[700vh] border border-gray-200 rounded-lg"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#4B5563 #E5E7EB',
            }}
          >
            <Table>
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  {visibleColumns.map(column => (
                    <th key={column} className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center justify-between">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {formatColumnName(column)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{column}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleColumn(column)}
                            className="mr-1"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={selectedColumn === column ? "default" : "ghost"}
                            size="sm"
                            onClick={() => toggleFilter(column)}
                            className="mr-1"
                          >
                            <Filter className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort(column)}
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, index) => (
                  <tr key={index}>
                    {visibleColumns.map(column => (
                      <td key={column} className="border px-4 py-2">
                         {typeof item[column] === 'object' ? (
                            <TruncatedCell content={JSON.stringify(item[column])} />
                          ) : (
                            <TruncatedCell content={String(item[column])} />
                          )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
            </div>
          
          <div className="mt-4 flex justify-between items-center">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span>Page {currentPage} of {Math.ceil(filteredData.length / itemsPerPage)}</span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredData.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredData.length / itemsPerPage)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}