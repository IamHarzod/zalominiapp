import { IsNotEmpty, IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class StartSessionDto {
  @IsNotEmpty({ message: 'classId không được để trống' })
  @IsUUID('4', { message: 'classId phải là một UUID hợp lệ' })
  classId: string;

  @IsNotEmpty({ message: 'sessionNumber (buổi học số mấy) không được để trống' })
  @IsNumber({}, { message: 'sessionNumber phải là số nguyên' })
  @Min(1, { message: 'sessionNumber phải lớn hơn hoặc bằng 1' })
  sessionNumber: number;

  @IsNotEmpty({ message: 'sessionLat (Vĩ độ phòng học) không được để trống' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  sessionLat: number;

  @IsNotEmpty({ message: 'sessionLong (Kinh độ phòng học) không được để trống' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  sessionLong: number;

  @IsOptional()
  @IsNumber()
  @Min(5, { message: 'Bán kính tối thiểu là 5 mét' })
  @Max(500, { message: 'Bán kính tối đa là 500 mét' })
  allowedRadius?: number;
}
