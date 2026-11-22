import { IsNotEmpty, IsUUID, IsString, IsNumber, Min, Max } from 'class-validator';

export class CheckInDto {
  @IsNotEmpty({ message: 'sessionId không được để trống' })
  @IsUUID('4', { message: 'sessionId phải là một UUID hợp lệ' })
  sessionId: string;

  @IsNotEmpty({ message: 'qrToken không được để trống' })
  @IsString({ message: 'qrToken phải là chuỗi ký tự' })
  qrToken: string;

  @IsNotEmpty({ message: 'clientLat (Vĩ độ thiết bị) không được để trống' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  clientLat: number;

  @IsNotEmpty({ message: 'clientLong (Kinh độ thiết bị) không được để trống' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  clientLong: number;
}
