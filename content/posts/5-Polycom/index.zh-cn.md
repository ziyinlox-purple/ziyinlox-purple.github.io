# 理解 Plonk（五）：多项式承诺

这篇文章主要围绕多项式承诺展开，包括介绍什么是多项式承诺，主要以 KZG10 多项式承诺为例展开，其中会涉及到 Pairing（双线性映射）、多项式余数定理、同点 Open 的证明聚合的一些技巧。

## 什么是多项式承诺

所谓承诺，是对消息「锁定」，得到一个锁定值。这个值被称为对象的「承诺」。

$$
c = commit(x)
$$

这个值和原对象存在两个关系，即 Hiding 与 Binding。

Hiding： $c$ 不暴露任何关于 $x$ 的信息；

Binding：难以找到一个 $x', x'\neq x$，使得 $c=commit(x')$。

最简单的承诺操作就是 Hash 运算。请注意这里的 Hash 运算需要具备密码学安全强度，比如 SHA256，Keccak 等。除了 Hash 算法之外，还有 Pedersen 承诺等。

顾名思义，多项式承诺可以理解为「多项式」的「承诺」。如果我们把一个多项式表达成如下的公式，

$$
f(X) = a_0 + a_1X + a_2X^2 + \cdots + a_nX^n
$$

那么我们可以用所有系数构成的向量来唯一标识多项式 $f(X)$。

$$
(a_0, a_1, a_2,\ldots, a_n)
$$

**如何对一个多项式进行承诺？**

第一种方法，我们可以把「系数向量」进行 Hash 运算，得到一个数值，就能建立与这个多项式之间唯一的绑定关系。

$$
C_1 = \textrm{SHA256}(a_0\parallel a_1 \parallel a_2 \parallel \cdots \parallel a_n)
$$

假设有一个多项式： $f(x) = 3 + 4x +5x_{2}$，

那它的系数向量是： $[3,4,5]$。

我们接下来把系数转换为字符串并连接： $“3\parallel4\parallel5”$，

再用 `SHA256` 对字符串 $“3\parallel4\parallel5”$ 进行哈希运算，假设输出值为:`a1f4d3b3c6e4b7d5d6e4f5c6a7b8c9d0e1f2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0`

上面这串哈希值就是多项式 $f(x) = 3 + 4x +5x^{2}$ 的唯一标识符。


另一种方法，我们也可以使用 Petersen 承诺，通过一组随机选择的基，来计算一个 ECC 点：

$$
C_2 = a_0 G_0 + a_1 G_1 + \cdots + a_n G_n
$$

如果在 Prover 承诺多项式之后，Verifier 可以根据这个承诺，对被锁定的多项式进行求值，并希望 Prover 可以证明求值的正确性。假设 $C=Commit(f(X))$，Verifier 可以向提供承诺的 Prover 询问多项式在 $X=\zeta$ 处的取值。Prover 除了回复一个计算结果之外（如 $f(\zeta) = y$），还能提供一个证明 $\pi$，证明 $C$ 所对应的多项式 $f(X)$ 在 $X=\zeta$ 处的取值 $y$ 的正确性。

多项式承诺的这个「携带证明的求值」特性非常有用，它可以被看成是一种轻量级的「可验证计算」。即 Verifier 需要把多项式 $f(X)$ 的运算代理给一个远程的机器（Prover），然后验证计算（计算量要小于直接计算 $f(X)$）结果 $y$ 的正确性；多项式承诺还能用来证明秘密数据（来自 Prover）的性质，比如满足某个多项式，Prover 可以在不泄漏隐私的情况下向 Verifier 证明这个性质。

虽然这种可验证计算只是局限在多项式运算上，而非通用计算。但通用计算可以通过各种方式转换成多项式计算，从而依托多项式承诺来最终实现通用的可验证计算。

按上面 $C_2$ 的方式对多项式的系数进行 Pedersen 承诺，我们仍然可以利用 Bulletproof-IPA 协议来实现求值证明，进而实现另一种多项式承诺方案。此外，还有 KZG10 方案，FRI，Dark，Dory 等等其它方案。

</br>

## KZG10 构造

与 Pedersen 承诺中用的随机基向量（没有关联性的随机生成点）相比，KZG10 多项式承诺需要用一组具有内部代数结构的基向量来代替。所谓的内部代数结构的基向量，是指基于一个随机秘密值 $\chi$ 幂次递归构造出来的公共参数（SRS），这是 KZG10 的核心基础，详情如下：

给定 $f(X) = a_0 + a_1 X + a_2 X^2 + \dots + a_{d-1} X^{d-1}$，其中 $a_0,a_1,a_2,\ldots,a_{d-1}$ 是多项式的系数。 

令 $X=\chi$ 代入上式，那么 $f(\chi) = a_0 + a_1 \chi + a_2 {\chi^2} + \dots + a_{d-1} {\chi^{d-1}}$

**需要特别注意和强调的是**: $\chi$ 是一个可信第三方提供的、特殊的秘密随机数，也被称为 Trapdoor，只用于在初始化阶段（Setup）生成系统参数，确保不可被 Prover 或 Verifier 知晓。并且，需要在第三方完成 Setup 后被彻底销毁，否则系统的安全性将被破坏。

所以公开参数 SRS 具体为：

$$
\mathsf{srs}=(G_0,G_1,G_2,\dots,G_{d-1}, H_0, H_1)
$$

其中， 

$$
G_0=G,\quad G_1=\chi G, \quad G_2=\chi^2 G, \quad \dots, \quad G_{d-1}=\chi^{d-1}G, \quad H_0=H, \quad H_1=\chi H
$$

> 注： 
> - $G$, $H$ 分别是椭圆曲线群 $\mathbb{G}$, $\mathbb{H}$ 中的生成元， $\chi$ 的幂次通过与生成元 $G$ 和 $H$ 做倍点运算嵌入到椭圆曲线点中（例如 $G_2=\chi^2 G$ 就是在椭圆曲线群上，重复对生成元 $G$ 相加 $\chi^2$ 次，最后得到椭圆曲线上的一个点）；
> - 除了 $G\in\mathbb{G}$ 和 $H \in\mathbb{H}$，这两个群之间还存在双线性映射 $e: \mathbb{G}\times\mathbb{H}\to \mathbb{G}_T$($\mathbb{G}_T$ 也是一个椭圆曲线群)。我们后面会用这个固定的映射去验证整除性，因此，双线性映射有一些性质需要知道：
>   1. 双线性性：对于所有 $G \in \mathbb{G}, H \in \mathbb{H}$，以及整数 $a,b$，有： $e(a \cdot G, b \cdot H)= e(G, H)^{ab}$ 。
>   2. 非退化性：如果 $G$ 是 $\mathbb{G}$ 的生成元且 $H$ 是 $\mathbb{H}$ 的生成元，那么 $e(G,H)$ 是 $\mathbb{G}_T$ 的生成元。
>   3. 此外， 映射 $e$ 可以在多项式时间内计算。

回到 $\mathsf{srs}=(G_0,G_1,G_2,\dots,G_{d-1}, H_0, H_1)$。当基向量 $(G_0,G_1,G_2,\dots,G_{d-1}, H_0, H_1)$ 已经根据秘密随机数 $\chi$ 完成初始化并固定下来，成为系统参数的一部分以后。试想一下，从外部看，这组其实具有一定规律的基向量与随机基向量根本难以被区分。很好，我们的目的达到了！

到这里为止，我们已经完成了最初始的 Setup 阶段，于是我们生成了两部分的 SRS：

1. $\mathbb{G}$ 基向量: $\mathsf{srs}_ {\mathbb{G}} = (G_0,G_1,G_2,\dots,G_{d-1})$， 其中 $G_i = \chi^i G$ ($i$ 是一个索引变量: $i$ 表示基向量 $\mathsf{srs}_{\mathbb{G}}$ 中的第 $i$ 个元素的索引，取值范围是 $0 \leq i < d$)
2. $\mathbb{H}$ 基向量: $\mathsf{srs}_{\mathbb{H}} = (H_0, H_1)$， 其中 $H_i = \chi^i H$ (这些点用来辅助验证，例如整除性验证)

在表示上，我们使用 Groth 发明的符号 $[1]_1\triangleq G$， $[1]_2\triangleq H$ 表示两个群上的生成元，那么KZG10 的系统参数（SRS）可以表示如下：

$$
\begin{align}
\mathsf{srs} & = ({\color{Violet} [} {\color{Red} 1} {\color{Violet} ]_1} ,{\color{Violet} [} {\color{Red} \chi} {\color{Violet} ]_1} ,{\color{Violet} [} {\color{Red} \chi^2} {\color{Violet} ]_1} ,{\color{Violet} [} {\color{Red} \chi^3} {\color{Violet} ]_1} ,\ldots,{\color{Violet} [} {\color{Red} \chi^{d-1}} {\color{Violet} ]_1} ,{\color{Green} [}{\color{Brown}  1} {\color{Green} ]_2} ,{\color{Green} [} {\color{Brown} \chi} {\color{Green} ]_2} )\\ 
& = ({\color{Red} 1} \cdot {\color{Violet} G}  ,{\color{Red} \chi} {\color{Violet} G} ,{\color{Red} {\chi^2}} {\color{Violet} G} ,{\color{Red} {\chi^3}}{\color{Violet} G}  ,\ldots ,{\color{Red} {\chi^{d-1}}}{\color{Violet} G}  ,{\color{Brown} 1} \cdot {\color{Green} H}  , {\color{Brown} \chi}{\color{Green} H})
\end{align}
$$

这种表示方式满足的关系是: $[\chi^i]_1 = {\chi^i}G, [\chi^i]_2 = {\chi^i}H$ ，其本质都是表示同一个 SRS ，只是记号不同而已。

接着，在 Setup 阶段完成后，Prover 可以使用 SRS 对一个多项式 $f(X)$ 生成承诺。

假设 $f(X)$ 是一个多项式: 

$$
f(X)=a_0 + a_1 X + a_2 X^2 + \dots + a_{d-1}X^{d-1}
$$

Prover 使用 SRS 的 $\mathbb{G}$ 部分，对多项式的系数向量 $[a_0,a_1,a_2,\dots,a_{d-1}]$ 进行承诺：

$$
C_{f(X)} = a_0 G_0 + a_1  G_1 + \cdots + a_{d-1} G_{d-1} 
$$

将 $G_i = \chi^i \cdot G$ 替换进去：

$$
C_{f(X)} = a_0 G + a_1(\chi G) + a_2(\chi^2 G) + \cdots + a_{d-1}(\chi^{d-1} G) 
$$

提取生成元 $G$:

$$
C_{f(X)} = a_0 + a_1\chi  + a_2\chi^2 + \cdots + a_{d-1}\chi^{d-1}  
$$

这意味着: $C_{f(X)} = f(\chi) \cdot G$

使用 Groth 的记号，可得 $C_{f(X)} = [f(\chi)]_ 1$。

> 总结一下：

> 其实 $C_{f(X)}$， $[f(\chi)]\_1$ 和 $f(\chi) G$ 表达的都是同一个意思，它们都表示将有限域元素 $f(\chi)$，即多项式 $f(\chi)$ 在秘密点 $\chi$ 处的求值，「嵌入」到椭圆曲线群 $\mathbb{G}$ 中的元素。

> 在 $C_ {f(X)}=[f(\chi)]_ 1$ 中， $\[f(\chi)]_ 1\$ 表示 Prover 将秘密点 $f(\chi)$ 处的求值，通过生成元 $[1]_ 1$ (也就是 $G$)嵌入 $\mathbb{G}$ 中。换言之，也就是 Prover 在 $\mathbb{G}$ 中使用生成元 $[1]_ 1$ (也就是 $G$) 对 $f(\chi)$ 进行承诺。 

> 需要注意的是：虽然对 $f(X)$ 的承诺可以化简得到 $C_{f(X)} = f(\chi) \cdot G$ ，但是需要注意的是 $\chi$ 这个值已经在 setup 阶段被销毁了，Prover 能获得的只有 $G_0, \ldots, G_{d-1}$ ，而不知道 $\chi$，所以在实际计算的时候是不能够将 $\chi$ 代入多项式 $f(X)$ 得到 $f(\chi)$ 的，Prover 的计算方式只能是： $C_{f(X)} = a_0 G_0 + a_1 G_1 + \cdots + a_{d-1} G_{d-1}$

接着继续，下面构造一个 $f(\zeta) = y$ 的 Open 证明，核心目的是让验证更加简洁高效。方法是将直接验证 $C_{f(X)}$ 转换为间接验证 $f(\zeta) = y$，也就是 $C_q$。以下是关键的步骤：

根据多项式余数定理（即：如果一个多项式 $f(X)$ 被一个线性多项式 $(X-\zeta)$ 除，那么所得的余数就是 $f(\zeta)$），将多项式 $f(X)$ 分解为：

$$
f(X) = q(X)\cdot (X-\zeta) + y
$$

其中，

- $(X-\zeta)$ 是一个线性多项式；
- $q(X)$ 是商多项式；
- $y$ 是余数， 并且是一个常数；
- 如果 $f(\zeta) \neq y$，则 $g(X) = f(X) - y$ 无法被 $(X - \zeta)$ 整除。

这个等式表明，任何一个多项式 $f(X)$ 都可以表示为：一个商多项式 $q(X)$ 与 $(X-\zeta)$ 的乘积，加上一个余数，也就是常数 $y$。

当 $X=\zeta$ 时， $(X-\zeta)=0$，因此乘积项 $q(X) \cdot (X-\zeta)$ 的值为 0，那么整个等式变为： $f(\zeta)=y$。

> 我们反过来推导上面的等式: $f(X) = q(X)\cdot (X-\zeta) + y$。假设 $f(\zeta) = y$，我们可以构造一个新的多项式 $g(X)$，定义为： $g(X) = f(X)-y$。
> - 在 $X = \zeta$ 时， $f(\zeta)=y$， $g(X)$ 的值为： $g(\zeta) = f(\zeta)-y = 0$，这意味着 $\zeta$ 为 $g(X)$ 的根。
> - 如果 $\zeta$ 为 $g(X)$ 的根， $g(X)$ 一定可以被 $(X-\zeta)$ 这个不可约多项式整除，因此等式可以写成： $g(X)=q(X)\cdot(X-\zeta)$，其中 $q(X)$ 是一个商多项式。
> - 将 $g(X)$ 的表达式代入 $g(X)=f(X)-y$，那么就是: $q(X)\cdot(X-\zeta)=f(X)-y$，整理后得到: $f(X)=q(X)\cdot(X-\zeta)+y$。

Prover 可以提供 $q(X)$ 多项式的承诺，记为 $C_q$ (承诺 $C_q$ 定义为 $C_q=q(\chi)G$) 作为 $f(\zeta)=y$ 的证明。Verifier 可以检查 $[q(\chi)]_1$ 是否满足整除性来验证证明。如果 $f(\zeta)\neq y$，那么 $g(X)$ 则无法被 $(X-\zeta)$ 整除，那么 Prover 提供的承诺 $C_q$ 将无法通过整除性检查：

$$
(f(X)-y)\cdot 1 \overset{?}{=} q(X) \cdot (X-\zeta)
$$

> **为什么上面进行验证的等式要「 $\cdot 1$」？**

> 这是因为用到了 pairing（双线性映射，也就是 $e:\mathbb{G}\times\mathbb{H} \to \mathbb{G}_T$。其中， $\mathbb{G}$ 和 $\mathbb{H}$ 是定义域上的两个群， $\mathbb{G}_T$ 是映射的值域群。pairing 的特性要求输入必须成对出现，例如 $(a, b)$， $(c, d)$，而不能单独输入某一项。

> 首先来看等式右边， $q(X)$ 的承诺是 $C_q = [q(\chi)]_ 1$， $(X - \zeta)$ 则通过 SRS 的结构化支持，可以表示为 $[\chi - \zeta]_ 1$，即 $(\chi - \zeta) \cdot G$，因此: $q(X) \cdot (X-\zeta) \quad \rightarrow \quad C_q \cdot [\chi-\zeta]_1$。

> 我们前面说到了，pairing 的特性要求输入必须成对出现，所以等式左边必须要有两个部分，左边的 $\cdot 1$ 可以视作一种形式上的占位符， $1$ 对应的是一个椭圆曲线群元素，记为 $[1]_ 1$，也就是群 $\mathbb{G}$ 中的生成元 $g$，因此 $(f(X)-y)\cdot 1 \quad \leftrightarrow \quad C_{f(X)} - y \cdot g$。

> 总结下来:一方面让输入的项数和位置对齐，确保在进行 pairing 的时候正确应用双线性映射，另一方面， $\cdot 1$ 也不会对运算的值产生影响。

承诺 $C_{f(X)}$ 是群 $\mathbb{G}$ 上的一个元素，通过承诺的加法同态映射关系，以及双线性映射关系 $e: \mathbb{G}\times\mathbb{H}\to \mathbb{G}_T$，Verifier 可以在 $\mathbb{G}_T$ 上验证整除性关系：

$$
e(C\_{f(X)} - y[1]_1, [1]_2) \overset{?}{=} e(C\_{q(X)}, [\chi]_2 - \zeta [1]_2)
$$

> **解释上面这个等式:**

> 首先是等式的左边: $e(C_{f(X)} - y[1]_1, [1]_2)$ 是将 $f(X) - y$ 的承诺与 $\mathbb{H}$ 的生成元配对，结果位于目标群 $\mathbb{G}_T$ 中。

> 这部分可以就所处的椭圆曲线群再拆成两个部分， $C_{f(X)} - y[1]_1$ 是在群 $\mathbb{G}$ 上，而 $[1]_2$ 是在群 $\mathbb{H}$ 上，其中:
> - $C_{f(X)}$ 是多项式 $f(X)$ 的承诺: $C_{f(X)}=[f(\chi)]_1$
> - $y[1]_1$ 是常数 $y$ 的承诺: $y[1]_1 = y \cdot G$
> - $[1]_2$ 是群 $\mathbb{H}$ 的生成元（对应 $H$）
>
> 其次是等式右边: $e(C_{q(X)}, [\chi]_2 - \zeta [1]_2)$ 是将商多项式 $q(X)$ 的承诺与 $(\chi - \zeta)$ 的承诺配对，结果也位于目标群 $\mathbb{G}_T$ 中。

> 这部分也可以就所处的椭圆曲线群再拆成两个部分， $C_{q(X)}$ 在群 $\mathbb{G}$ 上，而 $[\chi]_2 - \zeta [1]_2$ 在群 $\mathbb{H}$ 上，其中:
> - $C_{q(X)}$ 是商多项式 $q(X)$ 的承诺: $C_{q(X)}=[q(\chi)]_1$
> - $[\chi]_2$ 是秘密值 $\chi$ 在群 $\mathbb{H}$ 中的表示: $[\chi]_2=\chi \cdot H$
> - $\zeta [1]_2$ 是常数 $\zeta$ 在群 $\mathbb{H}$ 中的表示: $\zeta[1]_2 = \zeta \cdot H$

这实际上是隐式验证了整除性条件: $f(\chi)-y \overset{?}{=}q(\chi)\cdot(\chi -\zeta)$

<img src="img/pairing relationship.png" width="40%" />


如果看到这里你已经明白了，那真是太棒了，你已经掌握了要领，我们继续学习！刚才我们简单说明了如何用整除性验证点值，从实际应用层面来说，Verifier 要验证上面这个多项式，需要 Prover 计算多项式除法并对 $q(X)$ 进行承诺:

$$
q(X)=\frac{f(X)-y}{X-{\zeta}}
$$

多项式除法相对复杂，尤其是当 $f(X)$ 是高次多项式时，计算成本很高。那有没有什么方法可以改进呢？是有的。

有时为了减少 Verifier 在 $\mathbb{H}$ 上的昂贵操作，上面的验证等式 $(f(X)-y)\cdot 1 \overset{?}{=} q(X) \cdot (X-\zeta)$ 可以变形为：

$$
f(X) + \zeta\cdot q(X) - y =  q(X)\cdot X
$$

> 上面的操作，我们通过重新整理等式，在后续的 KZG 承诺验证中，方便将椭圆曲线点的计算统一到现有的系统参数（SRS）中。此变形简化了 Verifier 的验证公式，尤其是在 pairing 验证中，Verifier 可以避免昂贵的倍点计算（如 $\zeta[1]_2$ 的计算）。


经过变形后，我们可以再进一步深入了解 pairing 的作用:

$$
f(X) + \zeta\cdot q(X) - y =  q(X)\cdot X
$$


$$
e(C\_{f(X)} + \zeta\cdot C\_{q(X)} -y\cdot[1]_1,\ [1]_2)\overset{?}{=} e(C\_{q(X)},\  [\chi]_2)
$$

并且通过观察上面二者的变换关系，再来回顾和梳理一些知识点:

1. $e(\cdot,\cdot)$: 这是双线性配对运算，在这里定义为 $e:\mathbb{G} \times \mathbb{H} \to \mathbb{G_T}$，其中 $\mathbb{G}$ 和 $\mathbb{H}$ 是两个不同的椭圆曲线群， $\mathbb{G_T}$ 是目标群。
2. $C\_{f(X)}$ 和 $C\_{q(X)}$ 分别是多项式 $f(X)$ 和 $q(X)$ 的 commit，通常是通过一些 commit 方案，例如 Pedersen 承诺，将多项式映射到椭圆曲线上的点。
3. 在左边的 pairing 等式中， $C\_{f(X)} + \zeta\cdot C\_{q(X)} - y\cdot[1]_ 1$ 是相当于多项式 ${f(X)} + \zeta\cdot {q(X)} -y$ 的承诺；右边 $C_{q(X)}$ 是多项式 $q(X)$ 的承诺。

> 如果你仔细看的话，你会发现等式左边 $C_{f(X)} + \zeta\cdot C_{q(X)} -y\cdot[1]_1$ 中只有 $y$ 乘以 $[1]_1$，或许你会这样想: 是不是它们也已经 $\cdot 1$ ，可是并没有表示出来呢？事实并非如此，原因如下：

> 首先， $y\cdot [1]_ 1$ 是什么？ 这里的 $y \cdot [1]_ 1$ 表示的是常数 $y$ 乘以群 $\mathbb{G}$ 中的单位基 $[1]_ 1$ 。有一个潜规则是，在 pairing-based 证明系统中，常数 $y$ 不能直接和其他椭圆曲线上的承诺 $C_{f(X)}$ 等元素进行相加，因为它在没有乘以基点 $[1]_1$ 之前，它并不在椭圆曲线群 $\mathbb{G}$ 上，它必须要乘以基点 $[1]_1$，使得它也成为 $\mathbb{G}$ 中的点，才能参与后续的加法运算。

> 在上面的表达式中，由于 $C_{f(X)}$ 和 $\zeta \cdot C_{q(X)}$ （表示标量 $\zeta$ 乘以承诺 $C_q(X)$），它们本身已经是群 $\mathbb{G}$ 中的元素，且已经在群 $\mathbb{G}$ 中，因此不需要再乘以 $[1]_1$。简单来说，要想进行进一步的运算，首要是「同频」。在等式左边，常数 $y$ 需要显式地乘以 $[1]_1$ 来将它转换为群 $\mathbb{G}$ 中的元素，以便和其他在 $\mathbb{G}$ 中的元素进行相加运算。

> 如果你能理解左边的等式，那右边的等式相信你肯定也能理解，这里就不再赘述了。

</br>

## 同点 Open 的证明聚合

在一个更大的安全协议中，假如同时使用多个多项式承诺，那么他们的 Open 操作可以合并在一起完成。即把多个多项式先合并成一个更大的多项式，然后仅通过 Open 一点，来完成对原始多项式的批量验证。

假设我们有多个多项式， $f_1(X)$， $f_2(X)$。Prover 要同时向 Verifier 证明 $f_1(\zeta)=y_1$ 和 $f_2(\zeta)=y_2$，那么有: 

$$
\begin{array}{l}
f_1(X) = q_1(X)\cdot (X-\zeta) + y_1\\ 
f_2(X) = q_2(X) \cdot (X-\zeta) + y_2 \\
\end{array}
$$

通过一个随机数 $\nu$，Prover 可以把多项式 $f_1(X)$ 与 $f_2(X)$ 折叠在一起，得到一个临时的多项式 $g(X)$ ：

$$
g(X) = f_1(X) + \nu\cdot f_2(X)
$$

进而我们可以根据多项式余数定理，推导验证下面的等式：

$$
g(X) - (y_1 + \nu\cdot y_2) = (X-\zeta)\cdot (q_1(X) + \nu\cdot q_2(X))
$$

关于这个等式是如何推导出来的，可以再复习一遍前面的内容：

因为我们有: $f_1(X)=q_1(X)\cdot (X-\zeta)+y_1$， $f_2(X)=q_2(X)\cdot (X-\zeta)+y_2$， $g(X)=f_1(X)+v\cdot f_2(X)$，所以我们可以把 $f_1(X)$ 和 $f_2(X)$ 代入到 $g(X)$ 中：

$$
\begin{align}
g(X) & = q_1(X)\cdot (X-\zeta)+y_1 + \nu\cdot (q_2(X)\cdot (X-\zeta)+y_2)\\
g(X) & = q_1(X)\cdot (X-\zeta)+ y_1 + \nu\cdot q_2(X)\cdot (X-\zeta) + \nu\cdot y_2\\
g(X) & = q_1(X)\cdot (X-\zeta)+ \nu\cdot q_2(X)\cdot (X-\zeta) + y_1 + \nu\cdot y_2\\
g(X) - (y_1 + \nu\cdot y_2) & = q_1(X)\cdot (X-\zeta)+ \nu\cdot (q_2(X)\cdot (X-\zeta) \\
g(X) - (y_1 + \nu\cdot y_2) & = (X-\zeta)+ (q_1(X) + \nu\cdot q_2(X)) \\
\end{align}
$$

我们把 $g(X) - (y_1 + \nu\cdot y_2) = (X-\zeta)\cdot (q_1(X) + \nu\cdot q_2(X))$ 中的 $q_1(X)+\nu \cdot{q_2(X)}$ 看作为「商多项式」，记为 $q(X)$，也就是: $q(X) = q_1(X) + \nu\cdot q_2(X)$。

假如 $f_1(X)$ 在 $X=\zeta$ 处的求值证明为 $\pi_1$，而 $f_2(X)$ 在 $X=\zeta$ 处的求值证明为 $\pi_2$，那么根据群加法的同态性，Prover 可以得到商多项式  $q(X)$ 的承诺：

$$
[q(\chi)]_1 = \pi = \pi_1 + \nu\cdot\pi_2
$$

> 加法同态：对于两个群 $\mathbb{G}$ 和 $\mathbb{H}$，如果映射 $\phi : \mathbb{G} \to \mathbb{H}$ 满足以下条件，那么 $\phi$ 是一个同态: $\forall a,b \in \mathbb{G}, \phi(a+b)=\phi (a)+\phi (b)$ (其中具体的运算可能是加法或乘法，具体取决于群的定义)

因此，只要 Verifier 发给 Prover 一个额外的随机数 $\nu$，双方就可以把两个（甚至多个）多项式承诺折叠成一个多项式承诺 $C_g$：

$$
C_g = C_1 + \nu\ast C_2
$$

> 为什么中间运算符号是 $\ast$: 通常它仍然等价于 $C_g = C_1 + \nu \cdot C_2$， $\ast$ 的使用是为了表示计算机实现中的运算（如代码中调用的标量乘法函数），而非数学上的标量乘法符号。

并用这个折叠后的 $C_g$ 来验证多个多项式在一个点处的运算取值：

$$
y_g = y_1 + \nu\cdot y_2
$$

> 上面的 $y_1$ 和 $y_2$ 是多项式 $f_1$ 和 $f_2$ 在某个点的值。

通过折叠，把多个求值证明相应地折叠成一个，Verifier 只需要验证 $C_g$ 是否在给定点处可以等于 $y_g$，就可以一次确认 $f_1(X)$ 和 $f_2(X)$ 在给定点的值是否也分别为 $y_1$ 和 $y_2$:

$$
e({C_g}-y\ast G_0, H_0) \overset{?}{=}e(\pi, H_1 - \zeta \ast H_0)
$$

从而大大简化验证过程。

<img src="img/pairing2.png" width="40%" />


Schwartz-Zippel 引理说明：如果一个非零多项式 $P(X)$ 的次数为 $d$，那么在有限域 $\mathbb{F}_p$ 中，随机选择一个值 $\nu$ 使 $P(\nu) = 0$ 的概率至多为 $\frac{d}{p}$。

那么我们可以得到：

- 次数越高，伪造的概率越大： 如果 $P(X)$ 的次数 $d$ 变大，则 $P(x) = 0$ 的概率会增加；
- 有限域越大，伪造的概率越小： 如果有限域的大小 $p$ 足够大，则 $P(x) = 0$ 的概率会非常小。

对于两个不同的多项式 $f_1(X)$ 和 $f_2(X)$，如果 Prover 想伪造新的多项式 $f_1'(X)$ 和 $f_2'(X)$，使得折叠后的结果相同，即：

$$
f_1(X) + \nu f_2(X) = f'_1(X) + \nu f'_2(X)
$$

这等价于: $(f_1(X) - f'_1(X)) + \nu (f_2(X) - f'_2(X)) = 0$

记: $\Delta_1(X) = f_1(X) - f'_1(X)$， $\Delta_2(X) = f_2(X) - f'_2(X)$

于是有: $\Delta_1(X) + \nu \Delta_2(X) = 0$

为了让上式成立，Prover 必须找到一个 $\nu$，这意味着 $\nu$ 必须是 $\Delta_1(X)$ 和 $\Delta_2(X)$ 的特定线性关系的解。如果 $\Delta_1(X)$ 和 $\Delta_2(X)$ 是非零多项式，那么其次数为： $\max(\deg(\Delta_1), \deg(\Delta_2))$，那么 $\Delta_1(X) + \nu \cdot \Delta_2(X) = 0$ 的概率至多为： $\frac{\max(\deg(\Delta_1), \deg(\Delta_2))}{p}$。

(1) 如果 $\Delta_1(X)$ 和 $\Delta_2(X)$ 的次数较低

假设： $\deg(\Delta_1) = 2$， $\deg(\Delta_2) = 3$，那么 $\max(\deg(\Delta_1), \deg(\Delta_2)) = 3$，有限域大小为 $p = 2^{256}$，根据 Schwartz-Zippel 引理，伪造的概率为： $\frac{3}{2^{256}}$，这是一个极其小的概率，几乎不可能发生。

(2) 如果 $\Delta_1(X)$ 和 $\Delta_2(X)$ 的次数较高

假设： $\deg(\Delta_1) = 100$， $\deg(\Delta_2) = 200$，那么 $\max(\deg(\Delta_1), \deg(\Delta_2)) = 200$，有限域大小为 $p = 2^{256}$，伪造的概率为： $\frac{200}{2^{256}}$，虽然概率有所增加，但仍然极小。

因此，随机选择一个 $\nu$ 能使伪造成立的概率非常小，几乎为零。而由于引入了随机数 $\nu$，只是在现有的承诺基础上进行线性组合，它不会泄露秘密点 $\chi$ 的信息。相反， $\nu$ 的加入确保了随机线性组合的唯一性，防止了 Prover 利用线性组合伪造多项式的可能性，因此多项式的合并不会影响承诺的绑定关系（Schwartz-Zippel 引理）。


### 协议：

公共输入： $C\_{f_1}=[f_1(\chi)]_1$， $C\_{f_2}=[f_2(\chi)]_1$， $\zeta$， $y_1$， $y_2$

私有输入： $f_1(X)$， $f_2(X)$

证明目标： $f_1(\zeta)=y_1$， $f_2(\zeta)=y_2$

第一轮：Verifier 提出挑战数 $\nu$

第二轮：Prover 计算 $q(X)=q_1(X)+\nu\cdot q_2(X)$，并发送  $\pi=[q(\chi)]_1$

第三轮：Verifier 计算 $C_g=C_{f_1} + \nu\cdot C_{f_2}$， $y_g = y_1 + \nu\cdot y_2$

$$
e(C_g - [y_g]_1, [1]_2)\overset{?}{=}e(\pi, [\chi-\zeta]_2)
$$


我们通过一个具体的例子来展示这个协议的执行过程，假设以下值：

私有输入（Prover 知道的秘密）：
  - $f_1(X) = 3X + 1$
  - $f_2(X) = 5X + 6$

公共输入：
  - $C_{f_1} = [f_1(\chi)]_1 = [3]_1$ （ $f_1(\chi)$ 的承诺）
  - $C_{f_2} = [f_2(\chi)]_1 = [5]_1$ （ $f_2(\chi)$ 的承诺）
  - $\zeta = 2$ （验证点）
  - $y_1 = f_1(\zeta) = 7$ （ $f_1$ 在 $\zeta$ 处的值）
  - $y_2 = f_2(\zeta) = 16$ （ $f_2$ 在 $\zeta$ 处的值）

证明目标：证明 $f_1(\zeta) = y_1$ 和 $f_2(\zeta) = y_2$。

**以下是具体的协议执行步骤：**

第一轮：Verifier 提出挑战数 $\nu$，假设 $\nu = 4$。

</br>

第二轮：Prover 计算 $q(X)$ 并发送 $\pi= [q(\chi)]_1$

1. **计算 $q_1(X)$ 和 $q_2(X)$：**

  - $q_1(X) = \frac{f_1(X) - y_1}{X - \zeta}$：
  
    将 $f_1(X) = 3X + 1$ 和 $y_1 = 7$ 代入，得： $q_1(X) = \frac{(3X + 1) - 7}{X - 2} = \frac{3X - 6}{X - 2} = 3$

  - $q_2(X) = \frac{f_2(X) - y_2}{X - \zeta}$  
    将 $f_2(X) = 5X + 6$ 和 $y_2 = 16$ 代入，得：
    $q_2(X) = \frac{(5X + 6) - 16}{X - 2} = \frac{5X - 10}{X - 2} = 5$

2. **线性组合 $q(X)$：**

   计算 $q(X) = q_1(X) + \nu \cdot q_2(X)$，即：
   $$q(X) = 3 + 4 \cdot 5 = 3 + 20 = 23.$$

3. **计算 $\pi$：**

   $\pi = [q(\chi)]_1$，由于 $q(X)$ 是常数 $23$，因此：
   $$\pi = [23]_1.$$

Prover 将 $\pi = [23]_1$ 发送给 Verifier。

</br>

第三轮：Verifier 验证

Verifier 需要验证以下等式是否成立：

$$
e(C_g - [y_g]_ 1, [1]_ 2) \overset{?}{=} e(\pi, [\chi - \zeta]_ 2)
$$

1. **计算 $C_g$（线性组合的承诺）和 $y_g$（线性组合的值）：**

- $C_g = C_{f_1} + \nu \cdot C_{f_2}$，将 $C_{f_1} = [3]_ 1$， $C_{f_2} = [5]_ 1$ 和 $\nu = 4$ 代入，得： $C_g = [3]_1 + 4 \cdot [5]_1 = [3 + 20]_1 = [23]_1$

- $y_g = y_1 + \nu \cdot y_2$，将 $y_1 = 7$， $y_2 = 16$ 和 $\nu = 4$ 代入，得： $y_g = 7 + 4 \cdot 16 = 7 + 64 = 71$

2. **验证左边的双线性对：**

- 计算 $C_g - [y_g]_1$，将 $C_g = [23]_1$ 和 $[y_g]_1 = [71]_1$ 代入，得：

$$
C_g - [y_g]_1 = [23]_1 - [71]_1 = [-48]_1
$$


$$
e(C_g - [y_g]_1, [1]_2) = e([-48]_1, [1]_2)
$$

3. **验证右边的双线性对：**

    右边需要计算 $e(\pi, [\chi - \zeta]_2)$，将 $\pi = [23]_1$ 和 $\chi - \zeta = \chi - 2$ 代入，得： $e(\pi, [\chi - \zeta]_2) = e([23]_1, [\chi - 2]_2)$

4. **验证等式是否成立：**

   如果 $e([-48]_1, [1]_2) = e([23]_1, [\chi - 2]_2)$，则证明成立。


> 注：
> 上文中叙述的时候涉及到比较多的变形和术语，在理解的时候可能会有误会。虽然在数学意义上 $q(\chi)= \pi$，但是在称呼的时候有所不同：
> - $q(\chi)$ 会被称为求值证明；
> - $q(X)$ 的 KZG 承诺 是指 $[q(\chi)]_1$。


</br>

## 多项式约束与线性化

假设  $[f(\chi)]_1, [g(\chi)]_1, [h(\chi)]_1$ 分别是 $f(X),g(X),h(X)$ 的 KZG10 承诺，如果 Verifier 要验证下面的多项式约束：

$$
f(X) + g(X) \overset{?}{=} h(X)
$$

那么  Verifier 只需要把前两者的承诺相加，然后判断是否等于 $[h(\chi)]_1$  即可

$$
[f(\chi)]_1 + [g(\chi)]_1 \overset{?}{=} [h(\chi)]_1
$$

如果 Verifier 需要验证的多项式关系涉及到乘法，比如：

$$
f(X) \cdot g(X) \overset{?}{=} h(X)
$$

最直接的方法是利用双线性群的特性，在 $\mathbb{G}_T$ 上检查乘法关系，即验证下面的等式：

$$
e([f(\chi)]_1, [g(\chi)]_2) \overset{?}{=} e([h(\chi)]_1, [1]_2)
$$

看到这里，你真的理解上面这个等式了吗？再强调一遍：有一个潜规则 $e:(\mathbb{G},\mathbb{H}) \to \mathbb{G}_T$，

所以上面等式中的 $[f(\chi)]$ 一定在群 $\mathbb{G}$ 中，表示为 $[f(\chi)]_1$； $[g(\chi)]$ 一定在群 $\mathbb{H}$ 中，表示为 $[g(\chi)]_2)$。而 $e([f(\chi)]_1, [g(\chi)]_2)$ 的值，一定会落在群 $\mathbb{G}_T$ 中。

但是如果 Verifier 只有 $g(X)$ 在 $\mathbb{G}$ 上的承诺 $[g(\chi)]_1$，而非是在 $\mathbb{H}$ 上的承诺 $[g(\chi)]_2$，那么 Verifer 就无法利用双线性配对操作来完成乘法检验。

> 关于双线性配对的性质需要

另一个直接的方案是把三个多项式在同一个挑战点 $X=\zeta$ 上打开，然后验证打开值之间的关系是否满足乘法约束。假设 Verifier 要验证：

$$
f(X)\cdot g(X)\overset{?}{=} h(X)
$$

那么 Prover 发送 $f(\zeta)$, $g(\zeta)$, $h(\zeta)$。同时，Prover 提供三个求值证明 $\pi_{f(\zeta)}$, $\pi_{g(\zeta)}$, $\pi_{h(\zeta)}$，分别证明这些点值与对应的承诺匹配。

之后，Verifier 检查 $f(\zeta)\cdot g(\zeta)\overset{?}{=} h(\zeta)$ 验证三个求值证明是否正确。

这个方案的优势在于多项式的约束关系可以更加复杂和灵活，比如验证下面的稍微复杂些的多项式约束：

$$
f_1(X)f_2(X) + h_1(X)h_2(X)h_3(X) + g(X) = 0
$$

假设 Verifier 已拥有这些多项式的 KZG10 承诺， $[f_1(\chi)]_1$， $[f_2(\chi)]_1$， $[h_1(\chi)]_1$， $[h_2(\chi)]_1$， $[h_3(\chi)]_1$， $[g(\chi)]_1$。最直接粗暴的方案是让 Prover 在挑战点 $X=\zeta$ 处打开这 6 个承诺，发送 6 个在该点的值和对应的求值证明：

$$
(f_1(\zeta),\pi_{f_1}),(f_2(\zeta),\pi_{f_2}),(h_1(\zeta),\pi_{h_1}),(h_2(\zeta),\pi_{h_2}),(h_3(\zeta),\pi_{h_3}),(g(\zeta),\pi_{g})
$$

Verifier 除了验证上面 $6$ 个求值证明，并且验证下面的多项式约束：

$$
f_1(\zeta)f_2(\zeta) + h_1(\zeta)h_2(\zeta)h_3(\zeta) + g(\zeta) \overset{?}{=} 0
$$

但是，如果涉及的多项式较多，Prover 需要发送多个点值和求值证明，通信和计算成本就会比较高。有没有什么方法可以优化呢？是有的。

为了减少打开的多项式数量，Prover 可以引入辅助多项式。此外，利用 KZG10 承诺加法同态性，Verifier 可以在不增加通信成本的情况下验证复杂的乘法关系。

**具体的操作如下：**

首先，定义一个辅助多项式 $L(X)= \bar{f}\cdot g(X)-h(X)$，其中 $\bar{f} = f(\zeta) = c$，表示 $f(X)$ 在点 $\zeta$ 的具体值 $c$。如果 $f(X) \cdot g(X) = h(X)$ 成立，则在点 $X = \zeta$，有： $L(\zeta)= c\cdot g(\zeta)-h(\zeta)=\bar{f} \cdot g(\zeta)-h(\zeta)=0$

Prover 的操作：

1. 先打开 $f(X)$ 在点 $\zeta$ 的值：发送 $\bar{f} = f(\zeta)$ 和对应的求值证明 $\pi_{f(\zeta)}$ 给 Verifier。

2. Prover 再构造 $L(X)$ 的承诺： $[L(\chi)] _1 = \bar{f} \cdot [g(\chi) _1] - [h(\chi) _1]$，但这个承诺不需要发给 Verifier。因为对于 Verifier 而言，它在收到 $\bar{f}$ 之后，就可以利用承诺的加法同态性，直接构造 $L(X)$ 的承诺。

3. 打开 $L(X)$ 在点 $\zeta$ 的值：Prover 证明 $L(\zeta) = 0$，并提供一个求值证明 $\pi_{L(\zeta)}$。

Verifier 的操作:

1. 验证 $f(\zeta)$ 的求值证明： $e([f(\chi)]_ 1- \bar{f}\cdot[1]_ 1, [1]_ 2)\overset{?}{=} e(\pi_{f(\zeta)}, [\chi-\zeta]_ 2)$

2. 验证 $L(X)$ 的求值是否为零： $e([L(\chi)]_ 1, [1]_ 2)\overset{?}{=} e(\pi_{L(\zeta)}, [\chi-\zeta]_ 2)$，如果验证通过，则说明 $f(X) \cdot g(X) = h(X)$。

Prover 原本需要打开三个多项式( $f(X)$, $g(X)$, $h(X)$ )，但如果使用这个优化过后的方案，现在只需打开两个多项式（ $f(X)$ 和 $L(X)$）。第一个 Opening 是 $\bar{f}$ (提供 $f(\zeta)$ 的具体值，以确保后续计算的准确性)，第二个 Opening 的值为 $0$ (证明辅助多项式 $L(X)$ 在 $\zeta$ 处为零，间接验证乘积约束)。

我们仍然可以用上一节提供的聚合证明的方法，通过一个挑战数 $\nu$，Prover 可以聚合两个多项式承诺，然后仅需要发送一个求值证明。我们下面尝试用多项式聚合的方式优化 $6$ 个多项式的约束关系的协议： $f_1(X)f_2(X) + h_1(X)h_2(X)h_3(X) + g(X) = 0$。

### 协议：

公共输入： $C_{f_1}=[f_1(\chi)]_ 1$， $C_{f_2}=[f_2(\chi)]_ 1$， $C_{h_1}=[h_1(\chi)]_ 1$， $C_{h_2}=[h_2(\chi)]_ 1$， $C_{h_3}=[h_3(\chi)]_ 1$， $C_{g}=[g(\chi)]_ 1$，

私有输入： $f_1(X)$， $f_2(X)$， $h_1(X)$， $h_2(X)$， $h_3(X)$， $g(X)$

证明目标： $f_1(X)f_2(X) + h_1(X)h_2(X)h_3(X) + g(X) = 0$

第一轮：Verifier 发送 $X=\zeta$

第二轮：Prover 计算并发送三个 Opening， $\bar{f_1}=f_1(\zeta)$， $\bar{h}_1=h_1(\zeta)$， $\bar{h}_2=h_2(\zeta)$，

> 为什么 Prover 选择发送 $\bar{f}_1 = f_1(\zeta)$、 $\bar{h}_1 = h_1(\zeta)$、 $\bar{h}_2 = h_2(\zeta)$，而不是其他值，原因如下：

> $h_1(X)h_2(X)h_3(X)$ 是一个乘积项，只需知道其中两个值（如 $\bar{h}_1$ 和 $\bar{h}_2$），Verifier 可以通过等式倒推出 $\bar{h}_3$ 的值： $\bar{h}_3 = \frac{已知的乘积值}{h_1 \cdot h_2}$

> 是否可以选择发送其他值（如 $\bar{h}_3$）？

> 可以，发送 $\bar{h}_1$ 或 $\bar{h}_3$ 是等效的，但选择不同的值可能会导致 Verifier 的验证逻辑更加复杂和不优雅。如果 Prover 改为发送 $\bar{f}_1$、 $\bar{h}_2$ 和 $\bar{h}_3$，理论上仍然可以完成验证，但有以下问题：
> - 验证逻辑复杂度增加：Verifier 在验证 $h_1(X)h_2(X)h_3(X)$ 时，需要从 $\bar{h}_2$ 和 $\bar{h}_3$ 倒推出 $\bar{h}_1$，这可能使验证逻辑稍显不自然。
> - 可能引入冗余通信：如果 Prover 不发送 $\bar{h}_1$，Verifier 可能需要重新构造 $\bar{h}_1$ 的验证路径，在实际协议中增加额外的计算和验证步骤。

> 总结：尽可能选择简单的来做 ：）

第三轮：Verifier 发送 $\nu$ 随机数

第四轮：利用 $\nu$ 折叠 $(L(X), f_1(X),h_1(X),h_2(X))$ 这四个承诺，Prover 计算 $L(X)$ 和商多项式 $q(X)$，发送其承诺 $[q(\chi)]_1$ 作为折叠后的多项式在 $X=\zeta$ 处的求值证明

$$
L(X)=\bar{f}_1\cdot f_2(X) + \bar{h}_1\bar{h}_2\cdot h_3(X) + g(X)
$$

> **对于上式的解释：**
> - $\bar{f}_1 = f_1(\zeta)$， $\bar{h}_1 = h_1(\zeta)$， $\bar{h}_2 = h_2(\zeta)$ 是 Prover 在第二轮发送的 Opening 值。
> - $L(X)$ 的作用是将证明目标分解成两部分：
固定值 $\bar{f}_1$, $\bar{h}_1$, $\bar{h}_2$（这些值已经被 Prover 提供，Verifier 可以直接使用）。剩余的多项式部分 $f_2(X)$, $h_3(X)$, $g(X)$，通过 $L(X)$ 统一表示。

$$
\begin{align}
q(X) & = \frac{F(X)}{X-\zeta}\\ & = \frac{L(X) + \nu\cdot (f_1(X) -  \bar{f}_ 1)+ \nu^2 \cdot (h_1(X)- \bar{h}_ 1)+ \nu^3 \cdot (h_2(X)-\bar{h}_ 2)}{X-\zeta } 
\end{align}
$$

> **如何理解上面关于 $q(X)$ 的这个式子？**
> 1. 根据前面的内容， 商多项式 $q(X)=\frac{f(X)-y}{X-\zeta}$。其中， $f(X) - y$ 是一个多项式，它在 $X = \zeta$ 处的值为 $0$（因为 $f(\zeta) = y$）。因此， $f(X) - y$ 可以被 $X - \zeta$ 整除，且商就是 $q(X)$。
> 2. 现在我们的验证目标是 $f_1(X)f_2(X) + h_1(X)h_2(X)h_3(X) + g(X) = 0$，而为了验证它，我们引入一个多项式 $L(X)$
> 3. 为了减少通信开销，协议中引入了一个折叠技术。Verifier 使用一个随机挑战数 $\nu$，将多个多项式（ $L(X)$、 $f_1(X)$、 $h_1(X)$、 $h_2(X)$）线性组合成一个新的多项式： $F(X)=L(X) + \nu\cdot (f_1(X)-\bar{f}_1)+\nu^2\cdot (h_1(X)-\bar{h}_1)+\nu^3\cdot (h_2(X)-\bar{h}_2)$ ($F(X)$ 包含了所有与证明目标相关的多项式信息，这里的 $F(X)$ 相当于就是 $f(X) - y$，可以被 $(X - \zeta)$ 整除，且商就是 $q(X)$ )。


第五轮：Verifier 计算辅助多项式 $L(X)$ 的承诺 $[L(X)]_1$：

$$
[L(X)]_1 = \bar{f}_1\cdot[f_2(\chi)]_1 + \bar{h}_1\bar{h}_2\cdot[h_3(\chi)]_1 + [g(\chi)]_1
$$

计算折叠后的多项式的承诺： 

$$
[F(X)]_1=[L(X)]_1 + \nu \cdot  [f_1(\chi)]_1+\nu^2[h_1(\chi)]_1+\nu^3[h_2(\chi)]_1
$$

> 看到这个式子你有没有觉得很奇怪，为什么这里表示计算折叠后的多项式的承诺的式子 $[F(X)]_1$ 和 $F(X)$ 右侧不同？

> <img src="img/equal.png" width="60%" />

> $F(X)$ 能否表达成 $F(X)=L(X) + \nu\cdot f_1(X)+\nu^2\cdot h_1(X)+\nu^3\cdot h_2(X)$ 呢？实际上是可以的，我们可以反推。

> 根据多项式的余数定理，如果一个多项式 $F(X)$ 被一个线性多项式 $(X-\zeta)$ 除，那么所得的余数就是 $F(\zeta)$，如果我们移项得到： $q(X) = \frac{F(X) - F(\zeta)}{X - \zeta}$。

> 因为 Verifier 的验证是通过 $q(X)$ 来进行的，并且商多项式 $q(X)$ 的存在就已经约束了那些 opening 的值必须得是正确的，所以其实固定值 $\bar{f}_1$, $\bar{h}_1$, $\bar{h}_2$ 的这些情况已经被涵盖了。因此还有另一种 $F(X)$ 和 $q(X)$ 的表达： 如果 $F(X)=L(X) + \nu\cdot f_1(X)+\nu^2\cdot h_1(X)+\nu^3\cdot h_2(X)$， $q(X) = \frac{F(X) - F(\zeta)}{X - \zeta}$
 

计算折叠后的多项式在 $X=\zeta$ 处的求值： 

$$
E\overset{?}{=}F(\zeta)=\nu\cdot \bar{f}_1 + \nu^2\cdot\bar{h}_1+ \nu^3\cdot\bar{h}_2
$$

> 上面的 $E$ 是一个具体的值，它来自于 Verifier 的计算，用于验证 $F(\zeta)$ 处的值是否正确。

检查下面的验证等式：

$$
e([F(X)]_1-[E]_1 + \zeta[q(\chi)]_1, [1]_2)\overset{?}{=}e([q(\chi)]_1, [\chi]_2)
$$

这个优化后的协议，Prover 仅需要发送三个 Opening，一个求值证明；相比原始方案的 6 个 Opening和 6 个求值证明，大大减小了通信量（即证明大小）。


