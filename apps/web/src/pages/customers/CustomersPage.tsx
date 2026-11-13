import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Customer, Paginated } from '@dentalflow/types'
import { useTerms } from '../../org/OrganizationContext'

const PAGE_SIZE = 20

export function CustomersPage() {
  const terms = useTerms().customer
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [page, setPage] = useState(0)

  // Debounce the search box so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setName(search.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ['customers', { name, page }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) })
      if (name) params.set('name', name)
      return api<Paginated<Customer>>(`/customers?${params}`)
    },
    placeholderData: keepPreviousData,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <section>
      <div className="toolbar">
        <h1>{terms.plural}</h1>
        <Link className="button" to="/customers/new">
          Nuevo {terms.singular.toLowerCase()}
        </Link>
      </div>

      <input
        className="search"
        placeholder={`Buscar ${terms.plural.toLowerCase()} por nombre…`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isPending ? (
        <p className="muted">Cargando…</p>
      ) : error ? (
        <p className="error">No se pudo cargar el listado: {error.message}</p>
      ) : data.items.length === 0 ? (
        <p className="muted">
          {name ? `No hay resultados para "${name}".` : `Todavía no cargaste ${terms.plural.toLowerCase()}.`}
        </p>
      ) : (
        <>
          <table className={isFetching ? 'table loading' : 'table'}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>{c.documentId ?? '—'}</td>
                  <td>{c.phone ?? '—'}</td>
                  <td>{c.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span className="muted">
              Página {page + 1} de {totalPages} · {data.total} en total
            </span>
            <button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  )
}
