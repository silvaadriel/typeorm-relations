import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import Customer from '../infra/typeorm/entities/Customer';
import ICustomersRepository from '../repositories/ICustomersRepository';

interface IRequest {
  name: string;
  email: string;
}

@injectable()
class CreateCustomerService {
  constructor(
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ name, email }: IRequest): Promise<Customer> {
    try {
      const checkCustomer = await this.customersRepository.findByEmail(email);

      if (checkCustomer) {
        throw new AppError('Credentials already used.', 400);
      }

      const customer = await this.customersRepository.create({ name, email });

      return customer;
    } catch (err) {
      throw new AppError(err.message, err.statusCode);
    }
  }
}

export default CreateCustomerService;
