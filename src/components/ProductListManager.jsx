import { useState } from 'react'
import './ProductListManager.css'

const createProduct = () => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  name: '',
  price: '',
})

export default function ProductListManager() {
  const [products, setProducts] = useState([createProduct()])

  const handleChange = (id, event) => {
    const { name, value } = event.target

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === id ? { ...product, [name]: value } : product,
      ),
    )
  }

  const addProduct = () => {
    setProducts((prevProducts) => [...prevProducts, createProduct()])
  }

  return (
    <section className="product-list-manager">
      <div className="product-list-header">
        <h2>Product List</h2>
        <button type="button" className="add-product-btn" onClick={addProduct}>
          Add Product
        </button>
      </div>

      <div className="product-cards">
        {products.map((product, index) => (
          <article className="product-card" key={product.id}>
            <p className="product-id">ID: {product.id}</p>

            <div className="product-inputs">
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={product.name}
                  onChange={(event) => handleChange(product.id, event)}
                  placeholder={`Product ${index + 1} name`}
                />
              </label>

              <label>
                Price
                <input
                  type="number"
                  name="price"
                  value={product.price}
                  onChange={(event) => handleChange(product.id, event)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
