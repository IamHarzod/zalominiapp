import { IsNotEmpty, IsString } from 'class-validator';

export class ZaloLoginDto {
  @IsNotEmpty({ message: 'zaloAccessToken không được để trống' })
  @IsString({ message: 'zaloAccessToken phải là một chuỗi ký tự' })
  zaloAccessToken: string;
}
