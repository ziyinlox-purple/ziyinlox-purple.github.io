---
title: "Understanding PLONK (Part 4): Arithmetic Constraints and Copy Constraints"
date: 2026-03-10
draft: false
tags: ["Zero Knowledge", "Cryptography", "Math"]
categories: ["Tech"]
math: true
---


## Recap of Permutation Argument

In the previous section, we discussed how the Prover proves that two vectors $\vec{a}$ and $\vec{b}$ of length $n$ satisfy a pre-defined (public) permutation relationship $\sigma(\cdot)$, i.e.,

$$
a_i = b_{\sigma(i)}.
$$

The basic idea involves requesting a random challenge $\beta$ from the Verifier, combining the "original vectors" ($\vec{a}$ and $\vec{b}$) with their "position vectors" ($\vec{i}$ and $\sigma$), and generating two new vectors, denoted as $\vec{a}'$ and $\vec{b}'$:

$$
a'_i = a_i + \beta \cdot i, \qquad b'_i = b_i + \beta \cdot \sigma(i)
$$

The second step involves requesting another random challenge $\gamma$ from the Verifier to encode the multisets of $\vec{a}'$ and $\vec{b}'$ through a product, resulting in $A$ and $B$:

$$
A = \prod(a'_i + \gamma), \qquad B = \prod(b'_i + \gamma)
$$

The third step asks the Prover to prove that $A/B = 1$, i.e.,

$$
\prod_i \frac{(a'_i + \gamma)}{(b'_i + \gamma)} = 1
$$

To prove this product, we introduce an auxiliary vector $\vec{z}$ that records the intermediate results of the product computation:

$$
z_0 = 1, \qquad z_{i+1} = z_i \cdot \frac{(a'_i + \gamma)}{(b'_i + \gamma)}
$$

Since $z_n = \prod \frac{a'_i + \gamma}{b'_i + \gamma} = 1$, and $\omega^n = 1$, we can encode $\vec{z}$ using $z(X)$ and transform the Permutation Argument into a relationship involving $z(X)$, $a(X)$, and $b(X)$.

Finally, the Verifier sends a challenge $\zeta$ and queries $z(\zeta)$, $z(\omega \cdot \zeta)$, $a(\zeta)$, and $b(\zeta)$. The Verifier then checks the relationships between these values.

> **Note**: At this stage, we are only proving the existence of Multiset Equality. This means that $\vec{a}$ and $\vec{b}$ must contain the same elements, with the same multiplicities, without considering their specific positions or order.


</br>

## Copy Constraints Within a Single Vector

**Copy constraints** are conditions that require certain elements in a vector to be equal at multiple positions. Let’s start with a simple example:

$$
\vec{a} = (a_0, a_1, a_2, a_3)
$$

Assume we want the Prover to prove that $a_0 = a_2$. This can be achieved by swapping the positions of $a_0$ and $a_2$, forming a **permutation relationship**. If we use $(0, 1, 2, 3)$ to record the original positions of the elements, the new position vector after permutation is denoted as $\sigma$, and the permuted vector is $\vec{a}_\sigma$:

$$
\sigma = (2, 1, 0, 3), \quad \vec{a}_\sigma = (a_2, a_1, a_0, a_3).
$$

Clearly, as long as the Prover can prove that the original vector and the permuted vector are identical ($\vec{a} = \vec{a}_\sigma$), we can conclude that $a_0 = a_2$.

This method can be extended to prove that multiple elements in a vector are equal. For example, to prove that the first three elements of $\vec{a}$ are equal, we construct a permutation by cyclically shifting these three elements to the right:

$$
\sigma = (2, 0, 1, 3), \quad \vec{a}_\sigma = (a_2, a_0, a_1, a_3).
$$

From $\vec{a} = \vec{a}_\sigma$, it is straightforward to conclude that $a_0 = a_1 = a_2$.

</br>

## Copy Constraints Across Multiple Vectors

In the PLONK protocol, copy constraints often span multiple columns in the $W$ table. Since the protocol requires the Prover to encode each column into a polynomial, we need to extend the permutation argument to support equivalence between elements across multiple vectors.

{{< figure src="Example case.png" width="60%" >}}


For example, consider the $W$ table for the circuit below:

$$
\begin{array}{c|c|c|c|}
i & w_a & w_b & w_c  \\\\
\hline
0 & 0 & 0 & {\color{green}out} \\\\
1 & {\color{red}x_5} & {\color{blue}x_6} & {\color{green}out} \\\\
2 & x_1 & x_2 & {\color{red}x_5} \\\\
3 & x_3 & x_4 & {\color{blue}x_6} \\\\
\end{array}
$$

we need:

1. $w_{a,1} = w_{c,2}$
2. $w_{b,1} = w_{c,3}$
3. $w_{c,0} = w_{c,1}$

To support cross-vector permutations, we introduce **global unique identifiers** for elements across vectors. For instance, the three columns of $W$ are assigned unique position identifiers:

$$
\begin{array}{c|c|c|c|}
i & id_{a,i} & id_{b,i} & id_{c,i}  \\\\
\hline
0 & 0 & 4 & {\color{green}8} \\\\
1 & {\color{red}5} & {\color{blue}1} & {\color{green}9} \\\\
2 & 2 & 6 & {\color{red}11} \\\\
3 & 3 & 7 & {\color{blue}10} \\\\
\end{array}
$$

> **Note**: $id_{x,i}$ is a globally unique identifier for each element, used to unify cross-vector permutation relationships. These identifiers are assigned sequentially, starting from $0$.

The permuted vectors $\sigma_a$, $\sigma_b$, and $\sigma_c$ are:

$$
\begin{array}{c|c|c|c|}
i & \sigma_{a,i} & \sigma_{b,i} & \sigma_{c,i}  \\\\
\hline
0 & 0 & 4 & {\color{green}9} \\\\
1 & {\color{red}11} & {\color{blue}10} & {\color{green}8} \\\\
2 & 2 & 6 & {\color{red}5} \\\\
3 & 3 & 7 & {\color{blue}1} \\\\
\end{array}
$$


The Prover combines vectors $(\vec{w}_a, \vec{id_a})$, $(\vec{w}_b, \vec{id_b})$, $(\vec{w}_c, \vec{id_c})$, and their permuted counterparts $(\vec{w}'_a, \sigma_a)$, $(\vec{w}'_b, \sigma_b)$, $(\vec{w}'_c, \sigma_c)$ using a random challenge $\beta$ (provided by the Verifier). Then, using another random challenge $\gamma$, the Prover computes the multisets $W$ and $W'$, denoted as $f_i$ and $g_i$:

$$
\begin{split}
f_i &= (w_{a,i}+\beta\cdot id_{a,i}+\gamma)(w_{b,i}+\beta\cdot id_{b,i}+\gamma)(w_{c,i}+\beta\cdot id_{c,i}+\gamma) \\\\
g_i &= (w'\_{a,i}+\beta\cdot \sigma\_{a,i}+\gamma)(w'\_{b,i}+\beta\cdot \sigma\_{b,i}+\gamma)(w'\_{c,i}+\beta\cdot \sigma\_{c,i}+\gamma)
\end{split}
$$

Since the copy constraint requires the permuted vectors to be equal to the original ones, we have $w_a = w'_a$, $w_b = w'_b$, and $w_c = w'_c$. 

If we encode $\vec{w}_a,\vec{w}_b,\vec{w}_c,\vec{id}_a,\vec{id}_b,\vec{id}_c,\sigma_a, \sigma_b, \sigma_c$ into polynomials, we will get $w_a(X),w_b(X), w_c(X), id_a(X),id_b(X),id_c(X),\sigma_a(X),\sigma_b(X),\sigma_c(X)$. So $f(X)$, $g(X)$ will satisfy the following constraint relationships:

$$
\begin{aligned}
f(X) &= \Big(w_a(X) + \beta \cdot id_a(X) + \gamma\Big)\Big(w_b(X) + \beta \cdot id_b(X) + \gamma\Big)\Big(w_c(X) + \beta \cdot id_c(X) + \gamma\Big), \\
g(X) &= \Big(w_a(X) + \beta \cdot \sigma_a(X) + \gamma\Big)\Big(w_b(X) + \beta \cdot \sigma_b(X) + \gamma\Big)\Big(w_c(X) + \beta \cdot \sigma_c(X) + \gamma\Big).
\end{aligned}
$$

If the two multisets are equal, i.e., $f(X)$ and $g(X)$ satisfy Multiset Equality, then:

$$
\prod_{X \in H} f(X) = \prod_{X \in H} g(X)
$$

> **Note**: If two multisets are equal, their product is invariant to the order of elements due to the commutative and associative properties of multiplication. For instance, if $\{f_i\} = \{2,3,2\}$, $\{g_i\} = \{3,2,2\}$, then $\prod\{f_i\}=2 \times 3 \times 2 =12$; $\prod\{g_i\}=3 \times 2 \times 2 =12$, so their products are the same.

</br>

### Constructing the Accumulator Vector
If the equation above is slightly deformed, we can get:

$$
\prod_{X\in H}\frac{f(X)}{g(X)} = 1
$$

We define an auxiliary **accumulator vector** $\vec{z}$ to represent the intermediate results of the product computation:

$$
z_0 = 1, \qquad z_{i+1} = z_i \cdot \frac{f_i}{g_i}
$$

Where, the initial value of $z_0$ is $1$ and Prover computes $\vec{z}$ as follows:

$$
\begin{array}{|c|c|c|}
i & H_i & z_i \\\\
\hline
0 & \omega^0 = 1 & 1 \\\\
1 & \omega^1 & 1 \cdot \frac{f_0}{g_0} \\\\
2 & \omega^2 & \frac{f_0}{g_0} \cdot \frac{f_1}{g_1} \\\\
3 & \omega^3 & \frac{f_0 f_1}{g_0 g_1} \cdot \frac{f_2}{g_2} \\\\
\vdots & \vdots & \vdots \\
n-1 & \omega^{n-1} & \frac{f_0 f_1 \cdots f_{n-3}}{g_0 g_1 \cdots g_{n-3}} \cdot \frac{f_{n-2}}{g_{n-2}} \\\\
n & \omega^n = 1 & \frac{f_0 f_1 \cdots f_{n-1}}{g_0 g_1 \cdots g_{n-1}} = 1 \\\\
\end{array}
$$

> Note: $H_i$ in the above table represents the point set on a certain finite field $\mathbb{F}$, which are the "evaluation points" of polynomials $f(X)$ and $g(X)$. More specifically, the sampling points used in the discrete Fourier transform (DFT) over a finite field. These points are usually raised to the power of some $n$ unit root, that is, the value of $\omega^i$, where $\omega$ is an $n$ unit root. $H_i=\omega^i$

> In the table, $z_i$ is the recursive product calculated from the values ​​of $f(X)$ and $g(X)$ at point $H_i=\omega^i$. For example:

> $z_1 = z_0 \times \frac{f_0}{g_0} = 1 \times \frac{f_0}{g_0}$; $z_2 = z_1 \times \frac{f_1}{g_1} = \frac{f_0}{g_0} \times \frac{f_1}{g_1}$

> And so on until $z_n = \frac{{f_0}{f_1} \ldots {f_{n-1}}}{{g_0}{g_1} \dots {g_{n-1}}}$

> Finally, $z_n =1$ in the table is verified by the cumulative relationship of all points on $H$.

If $\vec{f}$ can be equal to $\vec{g}$ by product multiplication, then the last row $z_{n}$ is exactly equal to $1$, that is:

$$
z_n = z_0 = 1.
$$

Since $\omega^{n} = 1$, which just allows us to completely encode $(z_0, z_1, z_2, \ldots, z_{n-1})$ on the multiplicative subgroup $H$. Therefore, if it satisfies the following two polynomial constraints, we can derive $z_{n} = 1$ based on mathematical induction, which is the "copy constraint" we ultimately want:

$$
z(\omega^0) = 1, \quad z(\omega \cdot X)g(X) = z(X)f(X).
$$


</br>

## Permutation Relation $\sigma$

Before constructing copy constraints, the permutation relation $\sigma$ must be agreed upon and made public. The $W$ table contains all the inputs and outputs of arithmetic gates, but it does not describe whether the gates are connected by wires. The permutation relation $\sigma$ serves to supplement this information by describing which arithmetic gates are connected.

Thus, for a circuit in an "unwired state," it can be described using two tables: $(Q, \sigma)$, where $Q$ consists of selector vectors, and $\sigma$ consists of "permutation vectors."

{{< figure src="Example case.png" width="60%" >}}

Below is the $Q$ table:

$$
\begin{array}{c|c|c|c|}
i & q_L & q_R & q_M & q_C & q_O \\\\
\hline
0 & 0 & 0 & 0 & 99 & 1 \\\\
1 & 0 & 0 & 1 & 0 & 1 \\\\
2 & 1 & 1 & 0 & 0 & 1 \\\\
3 & 0 & 0 & 1 & 0 & 1 \\\\
\end{array}
$$

Below is the $S$ table, which describes the positions where permutations occur:

$$
\begin{array}{c|c|c|c|}
i & \sigma_{a,i} & \sigma_{b,i} & \sigma_{c,i}  \\\\
\hline
0 & 0 & 4 & [9] \\\\
1 & \boxed{11} & \underline{10} & [8] \\\\
2 & 2 & 6 & \boxed{5} \\\\
3 & 3 & 7 & \underline{1} \\\\
\end{array}
$$

</br>

## Handling Public Inputs

For the simple circuit example above, suppose we want to prove the existence of an assignment such that the output value `out` equals a specific public value, e.g., $out = 99$. The simplest way to achieve this is to use the $q_C$ column in the $Q$ table and add a constraint row where $q_L = q_R = q_M = 0$. This satisfies the following equation:

$$
q_C(X) - q_O(X)w_c(X) = 0
$$

### The Problem with Fixed Public Inputs

The issue with this approach is that these public values (i.e., input and output values) are hardcoded as constants. If the public value changes, the polynomial $q_C(X)$ must be recalculated. If the $W$ table has a large number of rows, this recalculation process can lead to significant performance overhead.

### Introducing Parameters for Public Inputs

To address this, we can introduce a parameter in the table to distinguish constant columns in the circuit. This parameter should allow changes to the public input values without affecting other parts of the circuit. To achieve this, we add a new column specifically for storing public parameters, denoted as $\phi$. With this addition, the arithmetic constraint becomes:

$$
q_L(X)w_a(X) + q_R(X)w_b(X) + q_M(X)w_a(X)w_b(X) - q_O(X)w_c(X) + q_C(X) + \phi(X) = 0
$$

We can also introduce public parameters by modifying the copy constraints.

>[!TODO]


</br>

## Optimizing Position Vectors

When constructing the three $\sigma$ vectors, we previously used natural numbers $(0, 1, 2, \cdots)$. This approach requires the Verifier to construct three polynomials ${id_a}(X)$, ${id_b}(X)$, and ${id_c}(X)$ before the protocol begins, and to query the Oracle in the final step to obtain the evaluations of these polynomials at the challenge point $X = \zeta$, i.e., $({id_a}(\zeta), {id_b}(\zeta), {id_c}(\zeta))$.

### Simplifying $\sigma$ Using Non-Natural Identifiers

Instead of using sequential natural numbers $(0, 1, 2, \cdots)$, the $\sigma$ vectors can be simplified by assigning unique, non-overlapping values for identifiers. For instance, if we use $H = (1, \omega, \omega^2, \cdots)$ (a multiplicative subgroup), the polynomials ${id_a}(X)$, ${id_b}(X)$, and ${id_c}(X)$ can be simplified as follows:

$$
\begin{aligned}
\vec{id}_a &= (1, \omega, \omega^2, \omega^3) \\
\vec{id}_b &= (k_1, k_1 \omega, k_1 \omega^2, k_1 \omega^3) \\
\vec{id}_c &= (k_2, k_2 \omega, k_2 \omega^2, k_2 \omega^3)
\end{aligned}
$$

where $k_i$ are distinct **quadratic non-residues**.


> **Note:** 

> Quadratic Residue: Given an odd prime $p$, an integer $a$ is a quadratic residue modulo $p$ if there exists an integer $x$ such that: $x^2 \equiv a \pmod{p}$. In other words, $a$ is a quadratic residue if it is the square of some number modulo $p$.

> Quadratic Non-Residue: If no such $x$ exists, $a$ is a quadratic non-residue modulo $p$.

> For $k_1$ and $k_2$, we select distinct values from the set of quadratic non-residues, ensuring $k_1 \neq k_2$. For more details, refer to [Plonk Course - Lecture 4 - Arithmetic Constraints and Copy Constraints](https://github.com/wenjin1997/awesome-zkp-learning/blob/main/courses/Plonk-GuoYu/lecture04/notes-plonk-lecture4-constraints.ipynb).

### Simplified Polynomials

Using the above identifiers, the polynomials become:

$$
id_a(X) = X, \quad id_b(X) = k_1 \cdot X, \quad id_c(X) = k_2 \cdot X.
$$

This drastically simplifies the construction of these polynomials, as well as their evaluation at $X = \zeta$. The Verifier can directly compute these values without additional complexity.

This optimization skill was first proposed by Vitalik. The use of $k_1$ and $k_2$ is intended to generate cosets of $(1, \omega, \omega^2, \omega^3)$ while ensuring that the cosets do not overlap. As mentioned earlier, $H = (1, \omega, \omega^2, \omega^3)$ is a multiplicative subgroup of $\mathbb{F}$. The cosets of $H$ are $H_1$ and $H_2$. If $H_1 = k_1 \cdot H$ and $H_2 = k_2 \cdot H$ have a non-empty intersection, then $H_1 = H_2$.

This statement can be proven as follows:

If they have an intersection, then $k_1 \omega^i = k_2 \omega^j$, which implies $k_1 = k_2 \cdot \omega^{j-i}$. Since $\omega^{j-i} \in H$, it follows that $k_1 \in H_2$. Therefore, $\forall i \in [n], k_1 \cdot \omega^i \in H_2$, which implies $H_1 \subseteq H_2$. Similarly, it can be shown that $H_2 \subseteq H_1$, so $H_1 = H_2$.

> **Note:**

> In other words, we have two sets: $H_1 = k_1 \cdot H$ and $H_2 = k_2 \cdot H$. Suppose $H_1$ and $H_2$ share at least one element, such as $k_1 \cdot \omega^i = k_2 \cdot \omega^j$.

> We can rewrite this equation as $k_1 = k_2 \cdot \omega^{j-i}$. Since $\omega^{j-i}$ is an element of $H$, and $H_2 = k_2 \cdot H$, it follows from $k_1 = k_2 \cdot \omega^{j-i}$ that $k_1$ is an element of $H_2$, i.e., $k_1 \in H_2$.

> The statement $\forall i \in [n], k_1 \cdot \omega^i \in H_2$ means that for every $i$ in the set $[n]$ (the set of integers from 0 to $n-1$), $k_1 \cdot \omega^i$ is an element of $H_2$. This implies $H_1 \subseteq H_2$ because:
> 1. $H_1 = \{k_1 \cdot \omega^0, k_1 \cdot \omega^1, \cdots, k_1 \cdot \omega^{n-1}\}$, which is the set obtained by multiplying $k_1$ with all powers of $\omega$.  
> 2. Since $\forall i \in [n], k_1 \cdot \omega^i \in H_2$, all elements of $H_1$ are contained in $H_2$.
> 3. Thus, if every element of $H_1$ belongs to $H_2$, $H_1$ is a subset of $H_2$. Similarly, it can be shown that $H_2$ is a subset of $H_1$, and therefore, $H_1 = H_2$.

If the number of columns in $\sigma$ increases, we need to select multiple $k_1, k_2, k_3, \ldots$ such that $(k_i / k_j)^n \neq 1$ to generate disjoint cosets. A straightforward way to achieve this is to select $k_1, k_2, k_3, \ldots = g^1, g^2, g^3, \ldots$, where $g$ is the generator of the multiplicative subgroup $T$, and $|T| \cdot 2^\lambda = p-1$.

</br>

## Protocol Framework

> 1. `[]` represents a **commitment**. The Verifier only knows the encrypted or hashed value $[z(X)]$, without knowing the actual content of $z(X)$ (this will be explained in the next section).  
> 2. $\phi(X)$ represents public inputs and outputs, which are known to both the Verifier and Prover. During the verification process, the Verifier uses these public values to ensure the correctness of the Prover's proof.

{{< figure src="framework.png" width="100%" >}}

**preprocessing phase**

The Prover and Verifier construct the commitments, including $[q_L(X)]$, $[q_R(X)]$, $[q_O(X)]$, $[q_M(X)]$, $[q_C(X)]$, $[{\sigma_a}(X)]$, $[{\sigma_b}(X)]$, $[{\sigma_c}(X)]$

**Step 1:**

The Prover constructs $[w_a(X)]$, $[w_b(X)]$, $[w_c(X)]$, and $\phi(X)$ for each column of the $W$ table such that:

$$
q_L(X)w_a(X)+q_R(X)w_b(X)+ q_M(X)w_a(X)w_b(X) - q_O(X)w_c(X)+q_C(X) + \phi(X) = 0
$$

**Step 2:**

The Verifier sends random challenges $\beta$ and $\gamma$.


**Step 3:**

The Prover constructs $[z(X)]$ such that:

$$
\begin{split}
L_0(X)(z(X)-1) &= 0 \\\\
z(\omega\cdot X)g(X) -  z(X)f(X) &= 0
\end{split}
$$


**Step 4:**

The Verifier sends another random challenge $\alpha$.


**Step 5:**

The Prover calculates $h(X)$ and constructs the quotient polynomial $[t(X)]$ such that:

$$
\begin{split}
h(X) = &\ q_L(X)w_a(X)+q_R(X)w_b(X)+ q_M(X)w_a(X)w_b(X) - q_O(X)w_c(X)+q_C(X) + \phi(X) \\\\
 & + \alpha(z(\omega X)\cdot g(X)-z(X)\cdot f(X)) + \alpha^2(L_0(X)\cdot(z(X)-1))
\end{split}
$$

Where:

$$
\begin{split}
f(X)&=\Big(w_a(X)+\beta\cdot {id_a}(X)+\gamma\Big)\Big(w_b(X)+\beta\cdot {id_b}(X)+\gamma\Big)\Big(w_c(X)+\beta\cdot {id_c}(X)+\gamma\Big)\\\\
g(X)&=\Big(w_a(X)+\beta\cdot {\sigma_a}(X)+\gamma\Big)\Big(w_b(X)+\beta\cdot {\sigma_b}(X)+\gamma\Big)\Big(w_c(X)+\beta\cdot {\sigma_c}(X)+\gamma\Big)\\\\
\end{split}
$$

The quotient polynomial $t(X)$ is defined as: $t(X) = \frac{h(X)}{z_H(X)}$


**Step 6:** 

The Verifier sends a final random challenge $\zeta$ and queries the following values from the oracles:

- $\bar{w}_a=w_a(\zeta)$， $\bar{w}_b=w_b(\zeta)$， $\bar{w}_c=w_c(\zeta)$
- $\bar{q}_L=q_L(\zeta)$， $\bar{q}_R=q_R(\zeta)$， $\bar{q}_M=q_M(\zeta)$，  $\bar{q}_O=q_O(\zeta)$， $\bar{q}_C=q_C(\zeta)$
- $\bar{\sigma}_a=\sigma_a(\zeta)$， $\bar{\sigma}_b=\sigma_b(\zeta)$， $\bar{\sigma}_c=\sigma_c(\zeta)$
- $\bar{z}\_{(\omega\cdot\zeta)}=z(\omega\cdot\zeta)$， $\bar{z}_{(\zeta)}=z(\zeta)$
- $\bar{t}=t(\zeta)$

The Verifier also computes the following values:

- $\bar{f}_{(\zeta)} = (\bar{w}_a + \beta \cdot \zeta + \gamma)(\bar{w}_b + \beta \cdot k_1 \cdot \zeta + \gamma)(\bar{w}_c + \beta \cdot k_2 \cdot \zeta + \gamma)$
- $\bar{g}_{(\zeta)} = (\bar{w}_a + \beta \cdot \bar{\sigma}_a + \gamma)(\bar{w}_b + \beta \cdot \bar{\sigma}_b + \gamma)(\bar{w}_c + \beta \cdot \bar{\sigma}_c + \gamma)$
- $L_0(\zeta)$
- $z_H(\zeta)$
- $\phi(\zeta)$

**Verification Step**

The Verifier checks the following equation:

$$
\begin{split}
& \bar{q}_L\bar{w}_a+\bar{q}_R\bar{w}_b+ \bar{q}_M\bar{w}_a\bar{w}_b - \bar{q}_O\bar{w}_c+\bar{q}_C + \phi(\zeta) + \alpha(\bar{z}\_{(\omega\cdot\zeta)}\cdot \bar{g}\_{(\zeta)}-\bar{z}\_{(\zeta)}\cdot \bar{f}\_{(\zeta)})+ \alpha^2(L_0(\zeta)\cdot(\bar{z}\_{(\zeta)}-1))\overset{?}{=}\bar{t}\cdot z_H(\zeta)
\end{split}
$$

If the equation holds, the proof is accepted; otherwise, it is rejected.

{{< figure src="framework.png" width="100%" >}}
