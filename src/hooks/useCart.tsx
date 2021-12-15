import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`/products/${productId}`);

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);

      const productIndex = cart.findIndex(({ id }) => id === productId);

      const updatedCart = [...cart];
      let amount = 1;

      if (productIndex >= 0) {
        amount = cart[productIndex].amount + 1;

        updatedCart.splice(productIndex, 1, {
          ...cart[productIndex],
          amount: cart[productIndex].amount + 1,
        });
      } else {
        updatedCart.push({ ...response.data, amount: 1 });
      }

      if (stockResponse.data.amount >= amount) {
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex((item) => item.id === productId);

      if (productIndex < 0) throw Error();

      const updatedCart = cart.filter(({ id }) => id !== productId);
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) throw Error();

      const response = await api.get<Stock>(`/stock/${productId}`);

      if (response.data.amount >= amount) {
        const productIndex = cart.findIndex(({ id }) => id === productId);
        if (productIndex < 0) throw Error();

        const updatedCart = [...cart];
        updatedCart.splice(productIndex, 1, { ...cart[productIndex], amount });

        setCart([...updatedCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
