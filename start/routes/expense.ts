import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const ExpenseList = () => import('#controllers/expense/crud/list')
const ExpenseCreate = () => import('#controllers/expense/crud/create')
const ExpenseUpdate = () => import('#controllers/expense/crud/update')
const ExpenseDelete = () => import('#controllers/expense/crud/delete')
const ExpenseCategoryList = () => import('#controllers/expense/categories/list')
const ExpenseCategoryCreate = () => import('#controllers/expense/categories/create')
const ExpenseCategoryDelete = () => import('#controllers/expense/categories/delete')

router
  .group(() => {
    // Expenses CRUD
    router.get('/', [ExpenseList, 'handle'])
    router.post('/', [ExpenseCreate, 'handle'])
    router.put('/:id', [ExpenseUpdate, 'handle'])
    router.delete('/:id', [ExpenseDelete, 'handle'])

    // Categories
    router.get('/categories', [ExpenseCategoryList, 'handle'])
    router.post('/categories', [ExpenseCategoryCreate, 'handle'])
    router.delete('/categories/:id', [ExpenseCategoryDelete, 'handle'])
  })
  .prefix(API_PREFIX + '/expenses')
  .use(middleware.auth())
  .use(middleware.vault())
