import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    try {
      const customer = await this.customersRepository.findById(customer_id);

      const productsFound = await this.productsRepository.findAllById(products);

      if (productsFound.length !== products.length) {
        throw new AppError('Invalid products.', 400);
      }

      const productsMapped = productsFound.map(product => {
        const productOrderQuantity = products.find(
          eachProduct => eachProduct.id === product.id,
        )?.quantity;

        if (productOrderQuantity) {
          if (productOrderQuantity > product.quantity) {
            throw new AppError('Product with insufficient quantity.', 400);
          }

          return {
            product_id: product.id,
            price: product.price,
            quantity: productOrderQuantity,
          };
        }

        throw new AppError('Missing product quantity data.', 400);
      });

      const productsWithQuantitySubtracted = productsFound.map(product => {
        const productQuantity = products.find(
          eachProduct => eachProduct.id === product.id,
        )?.quantity;

        return {
          id: product.id,
          quantity: productQuantity
            ? product.quantity - productQuantity
            : product.quantity,
        };
      });

      if (customer && productsMapped) {
        await this.productsRepository.updateQuantity(
          productsWithQuantitySubtracted,
        );

        const order = await this.ordersRepository.create({
          customer,
          products: productsMapped,
        });

        return order;
      }

      throw new AppError('Something is wrong with the data sent.', 400);
    } catch (err) {
      throw new AppError(err.message, err.statusCode);
    }
  }
}

export default CreateProductService;
