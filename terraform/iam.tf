# -----------------------------------------
# StockAI Backend IAM Role
# -----------------------------------------

resource "aws_iam_role" "stockai_backend_role" {
  name = "stockai-backend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "ec2.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "stockai-backend-role"
    Environment = "dev"
    Project     = "StockAI"
  }
}


# -----------------------------------------
# StockAI Backend CloudWatch Policy
# -----------------------------------------

resource "aws_iam_role_policy" "stockai_backend_cloudwatch" {
  name = "stockai-backend-cloudwatch-policy"
  role = aws_iam_role.stockai_backend_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      }
    ]
  })
}