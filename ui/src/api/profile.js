import client from './client'

export const getProfile = () => client.get('/profile/')

export const updateProfile = (data) => client.post('/profile/update', data)

export const addProduct = (product) => client.post('/profile/products/add', { product })

export const updateProduct = (index, product) => client.post('/profile/products/update', { index, product })

export const deleteProduct = (index) => client.post('/profile/products/delete', { index })
